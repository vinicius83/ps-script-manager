import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptContent, variables } = await req.json();

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ error: 'Script content is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Replace variables in script content
    let processedScript = scriptContent;
    if (variables && Array.isArray(variables)) {
      variables.forEach((variable: { name: string; value: string }) => {
        const regex = new RegExp(`\\$\\(${variable.name}\\)`, 'g');
        processedScript = processedScript.replace(regex, variable.value);
      });
    }

    console.log('Executing PowerShell script:', processedScript);

    // Execute PowerShell command using Deno
    const command = new Deno.Command("powershell", {
      args: ["-Command", processedScript],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    
    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    let result = '';
    if (output) {
      result += output;
    }
    if (error) {
      result += `\nError: ${error}`;
    }
    if (!output && !error) {
      result = 'Command executed successfully (no output)';
    }

    return new Response(
      JSON.stringify({ 
        output: result,
        exitCode: code,
        success: code === 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error executing PowerShell:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to execute PowerShell: ${error.message}`,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});