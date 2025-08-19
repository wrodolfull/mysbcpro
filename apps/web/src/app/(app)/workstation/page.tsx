"use client";

import { PageHeader } from '@mysbc/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default function WorkstationPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Workstation (CTI)" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Chamadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Painel de Chamadas</span>
            </CardTitle>
            <CardDescription>
              Interface CTI para atendentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p>Interface CTI será implementada aqui</p>
              <p className="text-sm">Controles de chamada, transferência, hold, etc.</p>
            </div>
          </CardContent>
        </Card>

        {/* Status do Agente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Status do Agente</span>
            </CardTitle>
            <CardDescription>
              Controle de disponibilidade e status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Controles de status serão implementados aqui</p>
              <p className="text-sm">Disponível, ocupado, pausa, etc.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Estatísticas do Dia</CardTitle>
          <CardDescription>
            Resumo das atividades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">8</div>
              <div className="text-sm text-gray-600">Chamadas Atendidas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">12m</div>
              <div className="text-sm text-gray-600">Tempo Médio</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">95%</div>
              <div className="text-sm text-gray-600">Satisfação</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">2</div>
              <div className="text-sm text-gray-600">Em Fila</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

