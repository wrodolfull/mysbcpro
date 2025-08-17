"use client";

import { PageHeader } from '@mysbc/ui';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface SurveyDTO {
  id?: string;
  organizationId: string;
  name: string;
  slug: string;
  questions: QuestionDTO[];
  enabled: boolean;
  createdAt?: string;
}

interface QuestionDTO {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'yes_no';
  required: boolean;
  options?: string[];
}

interface ResponseDTO {
  id?: string;
  surveyId: string;
  answers: AnswerDTO[];
  rating?: number;
  feedback?: string;
  createdAt?: string;
}

interface AnswerDTO {
  questionId: string;
  value: string | number;
}

export default function CSATPage() {
  const [surveys, setSurveys] = useState<SurveyDTO[]>([]);
  const [responses, setResponses] = useState<ResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyDTO | null>(null);

  // Mock orgId - em produção viria do contexto/auth
  const orgId = "org-mock-id";

  useEffect(() => {
    loadSurveys();
    loadResponses();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/csat/${orgId}/surveys`);
      if (response.ok) {
        const data = await response.json();
        setSurveys(data);
      }
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async () => {
    try {
      const response = await fetch(`http://localhost:4000/csat/${orgId}/responses`);
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
    }
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta pesquisa?')) return;
    
    try {
      const response = await fetch(`http://localhost:4000/csat/${orgId}/surveys/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadSurveys();
      }
    } catch (error) {
      console.error('Error deleting survey:', error);
    }
  };

  const getAverageRating = (surveyId: string) => {
    const surveyResponses = responses.filter(r => r.surveyId === surveyId);
    if (surveyResponses.length === 0) return 0;
    
    const totalRating = surveyResponses.reduce((sum, r) => sum + (r.rating || 0), 0);
    return (totalRating / surveyResponses.length).toFixed(1);
  };

  const getResponseCount = (surveyId: string) => {
    return responses.filter(r => r.surveyId === surveyId).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pesquisa de Satisfação" 
        actions={
          <Button onClick={() => setShowSurveyForm(true)}>
            + Nova Pesquisa
          </Button>
        }
      />

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pesquisas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">
              Pesquisas ativas no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responses.length}</div>
            <p className="text-xs text-muted-foreground">
              Respostas coletadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
            <div className="h-4 w-4 rounded-full bg-purple-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {surveys.length > 0 ? Math.round((responses.length / surveys.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Média de respostas por pesquisa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pesquisas */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pesquisas de Satisfação</CardTitle>
            <CardDescription>
              Gerencie suas pesquisas e visualize as respostas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questões</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Respostas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avaliação Média</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {surveys.map((survey) => (
                    <tr key={survey.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {survey.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {survey.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {survey.questions.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getResponseCount(survey.id!)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ⭐ {getAverageRating(survey.id!)}/5
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          survey.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {survey.enabled ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSurvey(survey);
                              setShowResponseForm(true);
                            }}
                          >
                            Ver Respostas
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteSurvey(survey.id!)}
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {surveys.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma pesquisa configurada. Clique em "Nova Pesquisa" para começar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showSurveyForm && (
        <SurveyForm 
          orgId={orgId}
          onSuccess={() => {
            loadSurveys();
            setShowSurveyForm(false);
          }}
          onCancel={() => setShowSurveyForm(false)}
        />
      )}

      {showResponseForm && selectedSurvey && (
        <ResponseViewer 
          survey={selectedSurvey}
          responses={responses.filter(r => r.surveyId === selectedSurvey.id)}
          onClose={() => {
            setShowResponseForm(false);
            setSelectedSurvey(null);
          }}
        />
      )}
    </div>
  );
}

function SurveyForm({ 
  orgId, 
  onSuccess, 
  onCancel 
}: { 
  orgId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<QuestionDTO[]>([
    { id: '1', text: 'Como você avalia nosso atendimento?', type: 'rating', required: true }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || questions.length === 0) return;

    const survey: SurveyDTO = {
      organizationId: orgId,
      name: name.trim(),
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      questions,
      enabled: true
    };

    try {
      const response = await fetch(`http://localhost:4000/csat/${orgId}/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey)
      });
      
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      alert('Erro ao criar pesquisa');
    }
  };

  const addQuestion = () => {
    const newQuestion: QuestionDTO = {
      id: `${questions.length + 1}`,
      text: '',
      type: 'rating',
      required: true
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof QuestionDTO, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Nova Pesquisa de Satisfação</CardTitle>
          <CardDescription>
            Configure as perguntas da sua pesquisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Pesquisa *</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pesquisa de Satisfação - Atendimento"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questões</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  + Adicionar Questão
                </Button>
              </div>
              
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Questão {index + 1}</span>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length === 1}
                    >
                      Remover
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Texto da Questão *</Label>
                    <Input
                      type="text"
                      required
                      value={question.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                      placeholder="Digite a pergunta..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="rating">Avaliação (1-5)</option>
                        <option value="text">Texto Livre</option>
                        <option value="yes_no">Sim/Não</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={question.required}
                        onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <Label htmlFor={`required-${index}`}>Obrigatória</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!name.trim() || questions.length === 0}
              >
                Criar Pesquisa
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ResponseViewer({ 
  survey, 
  responses, 
  onClose 
}: { 
  survey: SurveyDTO;
  responses: ResponseDTO[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Respostas: {survey.name}</CardTitle>
          <CardDescription>
            Visualize as respostas coletadas para esta pesquisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma resposta coletada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response, index) => (
                <div key={response.id} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Resposta #{index + 1}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(response.createdAt || '').toLocaleDateString()}
                    </span>
                  </div>
                  
                  {response.rating && (
                    <div className="mb-2">
                      <span className="text-sm font-medium">Avaliação: </span>
                      <span className="text-yellow-600">⭐ {response.rating}/5</span>
                    </div>
                  )}
                  
                  {response.feedback && (
                    <div className="mb-2">
                      <span className="text-sm font-medium">Feedback: </span>
                      <span className="text-gray-700">{response.feedback}</span>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    {response.answers.map((answer) => {
                      const question = survey.questions.find(q => q.id === answer.questionId);
                      return (
                        <div key={answer.questionId} className="text-sm">
                          <span className="font-medium">{question?.text}: </span>
                          <span className="text-gray-700">{answer.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-6 border-t mt-6">
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

