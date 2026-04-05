import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = params;

  const encoder = new TextEncoder();

  // Create a Server-Sent Events (SSE) stream for real-time MongoDB updates
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      // Listen for client disconnect
      request.signal.addEventListener('abort', () => {
        isClosed = true;
      });

      // Send initial state immediately
      try {
        const initialSession = await Session.findOne({ sessionId: id }).lean();
        if (initialSession) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialSession)}\n\n`));
        }
      } catch (e) {
        console.error("Initial SSE fetch error:", e);
      }

      // Poll database rapidly to push updates to the open stream. 
      // Network delays are handled by the frontend latency math.
      const intervalId = setInterval(async () => {
        if (isClosed) {
          clearInterval(intervalId);
          return;
        }
        try {
          const session = await Session.findOne({ sessionId: id }).lean();
          if (session) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(session)}\n\n`));
          }
        } catch (error) {
          console.error('SSE Polling Error:', error);
        }
      }, 500); // Poll every 500ms for near real-time reaction

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}