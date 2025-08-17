import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TtsRequestDTO, AudioFileDTO } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';
import { QuotasService } from '../quotas/quotas.service';

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(
    private readonly supa: SupabaseService,
    private readonly quotas: QuotasService
  ) {}

  private get audioBase() {
    return process.env.ENGINE_AUDIO_DIR || '/var/lib/freeswitch/storage/tenant';
  }

  async list(orgId: string, type?: 'uploaded' | 'tts'): Promise<AudioFileDTO[]> {
    try {
      this.logger.log(`Listing audio files for org ${orgId}, type filter: ${type}`);
      
      let query = this.supa.getAdmin()
        .from('audios')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      
      if (error) {
        this.logger.error('Failed to list audio files', error);
        throw error;
      }

      return data?.map(this.mapFromDB) || [];
    } catch (err) {
      this.logger.error('Error in AudioService.list:', err);
      throw err;
    }
  }

  async findOne(orgId: string, id: string): Promise<AudioFileDTO> {
    this.logger.log(`Finding audio file ${id} for org ${orgId}`);

    const { data, error } = await this.supa.getAdmin()
      .from('audios')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Audio file ${id} not found`);
      }
      this.logger.error('Failed to find audio file', error);
      throw error;
    }

    return this.mapFromDB(data);
  }

  async upload(orgId: string, file: any, name?: string): Promise<AudioFileDTO> {
    this.logger.log(`Uploading audio file for org ${orgId}`);

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only WAV and MP3 files are allowed');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    try {
      // Create tenant audio directory
      const audioDir = path.join(this.audioBase, orgId, 'uploaded');
      await fs.mkdir(audioDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const filename = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const audioPath = path.join(audioDir, filename);

      // Save file to filesystem
      await fs.writeFile(audioPath, file.buffer);

      // Save metadata to database
      const payload = {
        organization_id: orgId,
        name: name || file.originalname,
        type: 'uploaded',
        filename,
        mime_type: file.mimetype,
        size_bytes: file.size,
        storage_path: `${orgId}/uploaded/${filename}`,
        engine_path: audioPath
      };

      const { data, error } = await this.supa.getAdmin()
        .from('audios')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Clean up file if database save fails
        await fs.unlink(audioPath).catch(() => {});
        this.logger.error('Failed to save audio metadata', error);
        throw error;
      }

      const created = this.mapFromDB(data);
      this.logger.log(`Audio file ${created.id} uploaded successfully`);
      
      return created;
    } catch (error) {
      this.logger.error('Failed to upload audio file', error);
      throw error;
    }
  }

  async generateTts(orgId: string, request: TtsRequestDTO): Promise<AudioFileDTO> {
    this.logger.log(`Generating TTS for org ${orgId}`);

    if (!request.text || request.text.trim().length === 0) {
      throw new BadRequestException('Text is required for TTS generation');
    }

    if (request.text.length > 5000) {
      throw new BadRequestException('Text must be less than 5000 characters');
    }

    // Check quota
    const month = currentMonth();
    const quota = await this.quotas.get(orgId, month);
    const needed = request.text.length;
    
    if (quota.usage.tts_units_used + needed > quota.limits.tts_units) {
      throw new BadRequestException(`TTS quota exceeded. Used: ${quota.usage.tts_units_used}, Limit: ${quota.limits.tts_units}, Needed: ${needed}`);
    }

    try {
      // Create tenant TTS directory
      const ttsDir = path.join(this.audioBase, orgId, 'tts');
      await fs.mkdir(ttsDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `tts_${timestamp}.wav`;
      const audioPath = path.join(ttsDir, filename);

      // Generate TTS audio (placeholder - in real implementation, call ElevenLabs API)
      const ttsResult = await this.generateTtsFile(request.text, request.voice, audioPath);

      // Update quota
      await this.quotas.addTts(orgId, month, needed);

      // Save metadata to database
      const payload = {
        organization_id: orgId,
        name: request.text.substring(0, 50) + (request.text.length > 50 ? '...' : ''),
        type: 'tts',
        filename,
        mime_type: 'audio/wav',
        size_bytes: ttsResult.sizeBytes,
        storage_path: `${orgId}/tts/${filename}`,
        engine_path: audioPath,
        tts_text: request.text,
        tts_voice: request.voice,
        tts_chars_used: needed
      };

      const { data, error } = await this.supa.getAdmin()
        .from('audios')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Clean up file if database save fails
        await fs.unlink(audioPath).catch(() => {});
        this.logger.error('Failed to save TTS metadata', error);
        throw error;
      }

      const created = this.mapFromDB(data);
      this.logger.log(`TTS audio ${created.id} generated successfully, used ${needed} characters`);
      
      return created;
    } catch (error) {
      this.logger.error('Failed to generate TTS', error);
      throw error;
    }
  }

  private async generateTtsFile(text: string, voice?: string, outputPath?: string): Promise<{ sizeBytes: number }> {
    // Placeholder implementation - in real app, call ElevenLabs API
    // For now, create a dummy WAV file
    
    const dummyWavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x08, 0x00, 0x00, // File size - 8
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // Subchunk1 size
      0x01, 0x00,             // Audio format (PCM)
      0x01, 0x00,             // Number of channels
      0x40, 0x1F, 0x00, 0x00, // Sample rate (8000 Hz)
      0x80, 0x3E, 0x00, 0x00, // Byte rate
      0x02, 0x00,             // Block align
      0x10, 0x00,             // Bits per sample
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x08, 0x00, 0x00, // Subchunk2 size
    ]);

    // Create dummy audio data (silence)
    const audioDataSize = Math.min(text.length * 100, 8000); // Rough estimate
    const audioData = Buffer.alloc(audioDataSize, 0);
    
    const wavFile = Buffer.concat([dummyWavHeader, audioData]);
    
    if (outputPath) {
      await fs.writeFile(outputPath, wavFile);
    }

    this.logger.log(`TTS placeholder generated: ${text.length} chars -> ${wavFile.length} bytes (voice: ${voice || 'default'})`);

    return { sizeBytes: wavFile.length };
  }

  async getQuota(orgId: string, month?: string): Promise<{ month: string; limits: any; usage: any; remaining: any }> {
    const targetMonth = month || currentMonth();
    const quota = await this.quotas.get(orgId, targetMonth);

    return {
      month: targetMonth,
      limits: quota.limits,
      usage: quota.usage,
      remaining: {
        tts_units: quota.limits.tts_units - quota.usage.tts_units_used,
        flow_exec: quota.limits.flow_exec - quota.usage.flow_exec_used
      }
    };
  }

  async remove(orgId: string, id: string): Promise<{ ok: boolean }> {
    this.logger.log(`Removing audio file ${id} for org ${orgId}`);

    const audio = await this.findOne(orgId, id);
    
    try {
      // Remove file from filesystem
      if (audio.enginePath) {
        await fs.unlink(audio.enginePath).catch((error) => {
          this.logger.warn(`Failed to remove audio file from disk: ${audio.enginePath}`, error);
        });
      }

      // Remove from database
      const { error } = await this.supa.getAdmin()
        .from('audios')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to delete audio from database', error);
        throw error;
      }

      this.logger.log(`Audio file ${id} removed successfully`);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to remove audio file ${id}`, error);
      throw error;
    }
  }

  private mapFromDB(data: any): AudioFileDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      type: data.type,
      filename: data.filename,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      storagePath: data.storage_path,
      enginePath: data.engine_path,
      ttsText: data.tts_text,
      ttsVoice: data.tts_voice,
      ttsCharsUsed: data.tts_chars_used,
      createdAt: data.created_at
    };
  }
}
