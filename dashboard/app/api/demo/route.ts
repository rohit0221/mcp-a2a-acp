import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
    // In production (Vercel), return error - demo mode should be used
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return Response.json(
            { error: 'This endpoint is only available in local development. Use demo mode instead.' },
            { status: 501 }
        );
    }

    try {
        const { topic, apiKey } = await request.json();

        // Construct paths relative to project root
        const projectRoot = path.resolve(process.cwd(), '..');
        const pythonPath = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
        const scriptPath = path.join(projectRoot, 'demo_client.py');

        // Build args array
        const args = [scriptPath, topic];
        if (apiKey) {
            args.push(apiKey);
        }

        // Spawn the demo client process
        const child = spawn(pythonPath, args, {
            cwd: projectRoot,
            stdio: 'ignore' // Don't capture output
        });

        // Don't wait for the process to complete
        child.unref();

        return Response.json({ success: true, message: 'Demo started' });
    } catch (error) {
        console.error('Error starting demo:', error);
        return Response.json(
            { error: 'Failed to start demo' },
            { status: 500 }
        );
    }
}
