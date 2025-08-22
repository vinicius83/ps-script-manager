import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Play, Plus, Edit, Trash2, Terminal, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Script {
  id: string;
  name: string;
  content: string;
  description?: string;
  variables: string[];
  createdAt: Date;
}

interface VariableInput {
  name: string;
  value: string;
}

const PowerShellManager = () => {
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'execute'>('list');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [editingScript, setEditingScript] = useState<Partial<Script>>({});
  const [executionVariables, setExecutionVariables] = useState<VariableInput[]>([]);
  const [executionResult, setExecutionResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load scripts from database on component mount
  useEffect(() => {
    loadScripts();
  }, []);

  // Load scripts from Supabase
  const loadScripts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading scripts:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar scripts do banco de dados",
          variant: "destructive",
        });
        return;
      }

      const formattedScripts: Script[] = data.map(script => ({
        id: script.id,
        name: script.name,
        content: script.content,
        description: script.description || '',
        variables: script.variables || [],
        createdAt: new Date(script.created_at)
      }));

      setScripts(formattedScripts);
    } catch (error) {
      console.error('Error loading scripts:', error);
      toast({
        title: "Erro",
        description: "Falha ao conectar com o banco de dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para extrair variáveis do script
  const extractVariables = (scriptContent: string): string[] => {
    const regex = /\$\(([^)]+)\)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const handleCreateScript = async () => {
    const variables = extractVariables(editingScript.content || '');
    
    if (!editingScript.name?.trim() || !editingScript.content?.trim()) {
      toast({
        title: "Erro",
        description: "Nome e conteúdo do script são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editingScript.id) {
        // Update existing script
        const { error } = await supabase
          .from('scripts')
          .update({
            name: editingScript.name,
            content: editingScript.content,
            description: editingScript.description || '',
            variables: variables
          })
          .eq('id', editingScript.id);

        if (error) {
          throw error;
        }

        toast({
          title: "Script atualizado com sucesso!",
          description: `${variables.length} variáveis detectadas: ${variables.join(', ')}`,
        });
      } else {
        // Create new script
        const { error } = await supabase
          .from('scripts')
          .insert({
            name: editingScript.name,
            content: editingScript.content,
            description: editingScript.description || '',
            variables: variables
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Script criado com sucesso!",
          description: `${variables.length} variáveis detectadas: ${variables.join(', ')}`,
        });
      }

      // Reload scripts and reset form
      await loadScripts();
      setEditingScript({});
      setCurrentView('list');

    } catch (error) {
      console.error('Error saving script:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar script no banco de dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteScript = (script: Script) => {
    setSelectedScript(script);
    setExecutionVariables(
      script.variables.map(variable => ({ name: variable, value: '' }))
    );
    setExecutionResult('');
    setCurrentView('execute');
  };

  const handleEditScript = (script: Script) => {
    setEditingScript({
      id: script.id,
      name: script.name,
      content: script.content,
      description: script.description,
      variables: script.variables
    });
    setCurrentView('create');
  };

  const handleDeleteScript = async (scriptId: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('scripts')
        .delete()
        .eq('id', scriptId);

      if (error) {
        throw error;
      }

      await loadScripts();
      toast({
        title: "Script deletado!",
        description: "O script foi removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting script:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir script do banco de dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScript = () => {
    handleCreateScript(); // Same logic as create, but with existing ID
  };

  // Execute script with real PowerShell
  const handleRunScript = async () => {
    if (!selectedScript) return;

    setIsLoading(true);
    setExecutionResult('Executando script...\n');

    try {
      const { data, error } = await supabase.functions.invoke('execute-powershell', {
        body: {
          scriptContent: selectedScript.content,
          variables: executionVariables
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setExecutionResult(data.output || 'Script executado com sucesso (sem output)');
        toast({
          title: "Script Executado",
          description: "O script foi executado com sucesso!",
        });
      } else {
        setExecutionResult(`Erro na execução:\n${data.error || data.output}`);
        toast({
          title: "Erro na Execução",
          description: "O script falhou durante a execução",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error executing script:', error);
      setExecutionResult(`Erro ao executar script:\n${error.message}`);
      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor de execução",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Resultado copiado para a área de transferência",
    });
  };

  if (currentView === 'create') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{editingScript.id ? 'Editar Script' : 'Criar Novo Script'}</h1>
          </div>
          <Button variant="outline" onClick={() => setCurrentView('list')}>
            Voltar
          </Button>
        </div>

        <Card className="p-6 bg-gradient-card border-border shadow-card">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Script</Label>
              <Input
                id="name"
                placeholder="Ex: Criar Usuário AD"
                value={editingScript.name || ''}
                onChange={(e) => setEditingScript({...editingScript, name: e.target.value})}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Descrição opcional do script"
                value={editingScript.description || ''}
                onChange={(e) => setEditingScript({...editingScript, description: e.target.value})}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="content">Código PowerShell</Label>
              <Textarea
                id="content"
                placeholder="Digite seu script PowerShell aqui. Use $(variavel) para criar variáveis dinâmicas."
                value={editingScript.content || ''}
                onChange={(e) => setEditingScript({...editingScript, content: e.target.value})}
                className="mt-1 h-64 font-mono bg-code-bg"
              />
            </div>

            {editingScript.content && (
              <div className="space-y-2">
                <Label>Variáveis Detectadas:</Label>
                <div className="flex flex-wrap gap-2">
                  {extractVariables(editingScript.content).map((variable) => (
                    <Badge key={variable} variant="secondary" className="font-mono">
                      ${variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={handleCreateScript} 
                className="bg-gradient-primary hover:shadow-glow"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvando...' : (editingScript.id ? 'Atualizar Script' : 'Criar Script')}
              </Button>
              <Button variant="outline" onClick={() => { setEditingScript({}); setCurrentView('list'); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (currentView === 'execute' && selectedScript) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Executar Script: {selectedScript.name}</h1>
          </div>
          <Button variant="outline" onClick={() => setCurrentView('list')}>
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <h3 className="text-lg font-semibold mb-4">Configurar Variáveis</h3>
            <div className="space-y-4">
              {executionVariables.map((variable, index) => (
                <div key={variable.name}>
                  <Label htmlFor={variable.name} className="font-mono text-primary">
                    ${variable.name}
                  </Label>
                  <Input
                    id={variable.name}
                    placeholder={`Valor para ${variable.name}`}
                    value={variable.value}
                    onChange={(e) => {
                      const newVariables = [...executionVariables];
                      newVariables[index].value = e.target.value;
                      setExecutionVariables(newVariables);
                    }}
                    className="mt-1"
                  />
                </div>
              ))}

              <Button 
                onClick={handleRunScript} 
                className="w-full bg-gradient-primary hover:shadow-glow mt-6"
                disabled={executionVariables.some(v => !v.value) || isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? 'Executando...' : 'Executar Script'}
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resultado</h3>
              {executionResult && !isLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(executionResult)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              )}
            </div>
            
            {executionResult ? (
              <div className="bg-terminal-bg border border-border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
                {executionResult}
              </div>
            ) : (
              <div className="bg-terminal-bg border border-border rounded-lg p-4 text-center text-muted-foreground">
                Configure as variáveis e execute o script para ver o resultado
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 bg-gradient-card border-border shadow-card">
          <h3 className="text-lg font-semibold mb-4">Preview do Script</h3>
          <div className="bg-code-bg border border-border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-auto">
            {selectedScript.content}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">PowerShell Script Manager</h1>
        </div>
        <Button onClick={() => setCurrentView('create')} className="bg-gradient-primary hover:shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          Novo Script
        </Button>
      </div>

      {isLoading && scripts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando scripts...</p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-12">
          <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground mb-2">Nenhum script encontrado</p>
          <p className="text-muted-foreground">Crie seu primeiro script PowerShell clicando no botão acima</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {scripts.map((script) => (
            <Card key={script.id} className="p-6 bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold">{script.name}</h3>
                    <Badge variant="outline" className="font-mono">
                      {script.variables.length} variáveis
                    </Badge>
                  </div>
                  
                  {script.description && (
                    <p className="text-muted-foreground mb-3">{script.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {script.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="font-mono text-xs">
                        ${variable}
                      </Badge>
                    ))}
                  </div>

                  <div className="bg-code-bg border border-border rounded-lg p-3 font-mono text-sm">
                    <div className="text-muted-foreground mb-1"># {script.name}</div>
                    <div className="line-clamp-3">{script.content}</div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleExecuteScript(script)}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditScript(script)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteScript(script.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PowerShellManager;