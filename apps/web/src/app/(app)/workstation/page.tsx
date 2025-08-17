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
            <CardTitle>📞 Painel de Chamadas</CardTitle>
            <CardDescription>
              Interface CTI para atendentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📱</div>
              <p>Interface CTI será implementada aqui</p>
              <p className="text-sm">Controles de chamada, transferência, hold, etc.</p>
            </div>
          </CardContent>
        </Card>

        {/* Status do Agente */}
        <Card>
          <CardHeader>
            <CardTitle>👤 Status do Agente</CardTitle>
            <CardDescription>
              Controle de disponibilidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button variant="default" className="flex-1">
                🟢 Disponível
              </Button>
              <Button variant="outline" className="flex-1">
                🟡 Pausa
              </Button>
              <Button variant="outline" className="flex-1">
                🔴 Indisponível
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              <p>• Status atual: Disponível</p>
              <p>• Tempo online: 2h 15m</p>
              <p>• Chamadas atendidas hoje: 8</p>
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

