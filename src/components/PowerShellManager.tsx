import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Play, Plus, Edit, Trash2, Terminal, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [scripts, setScripts] = useState<Script[]>([
    {
      id: '1',
      name: 'Criar Usuário AD',
      content: `# Script para criar usuário no Active Directory
New-ADUser -Name "$(nomeCompleto)" -SamAccountName "$(usuario)" -UserPrincipalName "$(usuario)@$(empresa).com" -Path "OU=Users,DC=$(empresa),DC=com" -AccountPassword (ConvertTo-SecureString "$(senhaInicial)" -AsPlainText -Force) -Enabled $true
Write-Host "Usuário $(usuario) criado com sucesso na empresa $(empresa)"`,
      description: 'Script para criar novos usuários no Active Directory',
      variables: ['nomeCompleto', 'usuario', 'empresa', 'senhaInicial'],
      createdAt: new Date()
    }
  ]);

  const [currentView, setCurrentView] = useState<'list' | 'create' | 'execute'>('list');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [editingScript, setEditingScript] = useState<Partial<Script>>({});
  const [executionVariables, setExecutionVariables] = useState<VariableInput[]>([]);
  const [executionResult, setExecutionResult] = useState<string>('');

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

  const handleCreateScript = () => {
    const variables = extractVariables(editingScript.content || '');
    const newScript: Script = {
      id: Date.now().toString(),
      name: editingScript.name || 'Novo Script',
      content: editingScript.content || '',
      description: editingScript.description || '',
      variables,
      createdAt: new Date()
    };

    setScripts([...scripts, newScript]);
    setEditingScript({});
    setCurrentView('list');
    
    toast({
      title: "Script criado com sucesso!",
      description: `${variables.length} variáveis detectadas: ${variables.join(', ')}`,
    });
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

  const handleDeleteScript = (scriptId: string) => {
    setScripts(scripts.filter(script => script.id !== scriptId));
    toast({
      title: "Script deletado!",
      description: "O script foi removido com sucesso",
    });
  };

  const handleUpdateScript = () => {
    const variables = extractVariables(editingScript.content || '');
    const updatedScript: Script = {
      id: editingScript.id!,
      name: editingScript.name || 'Script Editado',
      content: editingScript.content || '',
      description: editingScript.description || '',
      variables,
      createdAt: new Date()
    };

    setScripts(scripts.map(script => 
      script.id === editingScript.id ? updatedScript : script
    ));
    setEditingScript({});
    setCurrentView('list');
    
    toast({
      title: "Script atualizado com sucesso!",
      description: `${variables.length} variáveis detectadas: ${variables.join(', ')}`,
    });
  };

  const handleRunScript = () => {
    if (!selectedScript) return;

    let processedScript = selectedScript.content;
    
    // Substituir variáveis pelos valores fornecidos
    executionVariables.forEach(variable => {
      const regex = new RegExp(`\\$\\(${variable.name}\\)`, 'g');
      processedScript = processedScript.replace(regex, variable.value);
    });

    // Simular execução do PowerShell
    const simulatedResult = `PowerShell 7.4.0
Copyright (c) Microsoft Corporation.

PS C:\\> ${processedScript}

${generateSimulatedOutput(selectedScript, executionVariables)}

PS C:\\> `;

    setExecutionResult(simulatedResult);
    
    toast({
      title: "Script executado com sucesso!",
      description: "Resultado disponível para cópia",
    });
  };

  const generateSimulatedOutput = (script: Script, variables: VariableInput[]): string => {
    if (script.name.includes('Usuário')) {
      const usuario = variables.find(v => v.name === 'usuario')?.value || 'usuario';
      const empresa = variables.find(v => v.name === 'empresa')?.value || 'empresa';
      return `Usuário ${usuario} criado com sucesso na empresa ${empresa}
Propriedades aplicadas:
- Nome completo: ${variables.find(v => v.name === 'nomeCompleto')?.value || 'N/A'}
- Login: ${usuario}
- UPN: ${usuario}@${empresa}.com
- Status: Ativo`;
    }
    
    // Para scripts de senha
    if (script.content.includes('$Senha') || script.content.includes('senha')) {
      const senha = variables.find(v => v.name === 'Senha')?.value;
      if (senha) {
        return `Senha: ${senha}`;
      }
    }
    
    // Simular saída baseada no conteúdo do script
    let output = '';
    if (script.content.includes('Write-Host')) {
      // Extrair e simular comandos Write-Host
      const writeHostMatches = script.content.match(/Write-Host\s+"([^"]+)"/g);
      if (writeHostMatches) {
        writeHostMatches.forEach(match => {
          let message = match.replace(/Write-Host\s+"/, '').replace(/"$/, '');
          // Substituir variáveis na mensagem
          variables.forEach(variable => {
            message = message.replace(new RegExp(`\\$${variable.name}`, 'g'), variable.value);
          });
          output += message + '\n';
        });
      }
    }
    
    return output || 'Script executado com sucesso!';
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
                onClick={editingScript.id ? handleUpdateScript : handleCreateScript} 
                className="bg-gradient-primary hover:shadow-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingScript.id ? 'Atualizar Script' : 'Criar Script'}
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
                disabled={executionVariables.some(v => !v.value)}
              >
                <Play className="h-4 w-4 mr-2" />
                Executar Script
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resultado</h3>
              {executionResult && (
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
                  <Play className="h-4 w-4 mr-2" />
                  Executar
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
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {scripts.length === 0 && (
          <Card className="p-12 text-center bg-gradient-card border-border shadow-card">
            <Terminal className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum script cadastrado</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando seu primeiro script PowerShell com variáveis dinâmicas
            </p>
            <Button onClick={() => setCurrentView('create')} className="bg-gradient-primary hover:shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Script
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PowerShellManager;