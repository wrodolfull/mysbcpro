"use client";

import { PageHeader } from '@mysbc/ui';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface AudioFileDTO {
  id?: string;
  organizationId: string;
  name: string;
  type: 'uploaded' | 'tts';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ttsText?: string;
  ttsVoice?: string;
  ttsCharsUsed?: number;
  createdAt?: string;
}

interface QuotaInfo {
  month: string;
  limits: { tts_units: number };
  usage: { tts_units_used: number };
  remaining: { tts_units: number };
}

export default function AudioPage() {
  const [files, setFiles] = useState<AudioFileDTO[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showTTS, setShowTTS] = useState(false);

  // Mock orgId - em produção viria do contexto/auth
  const orgId = "org-mock-id";

  useEffect(() => {
    loadAudioFiles();
    loadQuota();
  }, []);

  const loadAudioFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/audio/${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Error loading audio files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuota = async () => {
    try {
      const response = await fetch(`http://localhost:4000/audio/${orgId}/quota`);
      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error('Error loading quota:', error);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este arquivo?')) return;
    
    try {
      const response = await fetch(`http://localhost:4000/audio/${orgId}/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadAudioFiles();
        await loadQuota();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const quotaPercentage = quota ? (quota.usage.tts_units_used / quota.limits.tts_units) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Áudios & TTS" 
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              📁 Upload Arquivo
            </Button>
            <Button onClick={() => setShowTTS(true)}>
              🗣️ Gerar TTS
            </Button>
          </div>
        }
      />

      {/* Card de Quota TTS */}
      {quota && (
        <Card>
          <CardHeader>
            <CardTitle>Quota TTS - {quota.month}</CardTitle>
            <CardDescription>
              Seu limite mensal de caracteres para Text-to-Speech
            </CardDescription>
          </CardHeader>
          <CardContent>
    <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uso atual</span>
                <span className="text-sm text-gray-600">
                  {quota.usage.tts_units_used} / {quota.limits.tts_units} caracteres
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    quotaPercentage > 90 ? 'bg-red-500' : 
                    quotaPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Restante: {quota.remaining.tts_units} caracteres</span>
                <span>{quotaPercentage.toFixed(1)}% usado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Arquivos */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Biblioteca de Áudios</CardTitle>
            <CardDescription>
              Gerencie seus arquivos de áudio e gravações TTS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conteúdo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {file.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.type === 'tts' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {file.type === 'tts' ? 'TTS' : 'Upload'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.sizeBytes)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {file.type === 'tts' ? file.ttsText : file.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/api/audio/${orgId}/${file.id}/download`)}
                          >
                            Download
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteFile(file.id!)}
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {files.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum arquivo de áudio. Faça upload ou gere TTS para começar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showUpload && (
        <UploadForm 
          orgId={orgId}
          onSuccess={() => {
            loadAudioFiles();
            setShowUpload(false);
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {showTTS && (
        <TTSForm 
          orgId={orgId}
          quota={quota}
          onSuccess={() => {
            loadAudioFiles();
            loadQuota();
            setShowTTS(false);
          }}
          onCancel={() => setShowTTS(false)}
        />
      )}
    </div>
  );
}

function UploadForm({ 
  orgId, 
  onSuccess, 
  onCancel 
}: { 
  orgId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);

    try {
      const response = await fetch(`http://localhost:4000/audio/${orgId}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Upload de Arquivo</CardTitle>
          <CardDescription>
            Faça upload de arquivos MP3 ou WAV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo *</Label>
              <Input
                id="file"
                type="file"
                accept=".mp3,.wav"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-gray-500">Apenas arquivos MP3 e WAV até 10MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome personalizado para o arquivo"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!file || uploading}
              >
                {uploading ? 'Enviando...' : 'Upload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TTSForm({ 
  orgId,
  quota, 
  onSuccess, 
  onCancel 
}: { 
  orgId: string;
  quota: QuotaInfo | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('default');
  const [generating, setGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    // Verificar quota
    if (quota && text.length > quota.remaining.tts_units) {
      alert(`Texto muito longo! Você tem ${quota.remaining.tts_units} caracteres disponíveis.`);
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`http://localhost:4000/audio/${orgId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice })
      });
      
      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      alert('Erro ao gerar TTS');
    } finally {
      setGenerating(false);
    }
  };

  const charsUsed = text.length;
  const charsRemaining = quota ? quota.remaining.tts_units : 3000;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Gerar TTS</CardTitle>
          <CardDescription>
            Converta texto em áudio usando Text-to-Speech
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Texto *</Label>
              <textarea
                id="text"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o texto que será convertido em áudio..."
                required
                maxLength={5000}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{charsUsed} / 5.000 caracteres</span>
                <span>Restante na quota: {charsRemaining}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice">Voz</Label>
              <select
                id="voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Voz Padrão</option>
                <option value="female">Feminina</option>
                <option value="male">Masculina</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={generating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!text.trim() || generating || charsUsed > charsRemaining}
              >
                {generating ? 'Gerando...' : 'Gerar TTS'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

