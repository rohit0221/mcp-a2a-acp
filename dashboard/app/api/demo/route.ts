import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { topic } = await request.json();

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        // Path to the python script and venv
        // Assuming the dashboard is in /dashboard and the script is in /
        const projectRoot = path.resolve(process.cwd(), '..');
        const pythonPath = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
        const scriptPath = path.join(projectRoot, 'demo_client.py');

        console.log(`Starting demo with topic: "${topic}"`);
        console.log(`Script: ${scriptPath}`);

        // Spawn the python process
        const child = spawn(pythonPath, [scriptPath, topic], {
            cwd: projectRoot,
            stdio: 'ignore' // We don't need the output, events will be streamed via WebSocket
        });

        child.unref(); // Allow the parent process to exit independently

        return NextResponse.json({ success: true, message: 'Demo started' });
    } catch (error) {
        console.error('Failed to start demo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
