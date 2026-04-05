import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  await dbConnect();
  
  // FIX: In Next.js 15+, params is a Promise and must be awaited
  const { id } = await params;

  const encoder = new TextEncoder();

  // Create a Server-Sent Events (SSE) stream for real-time MongoDB updates
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      // Listen for client disconnect
      request.signal.addEventListener('abort', () => {
        isClosed = true;
      });

      const sendData = (data) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            isClosed = true;
          }
        }
      };

      // Send initial state immediately
      try {
        const initialSession = await Session.findOne({ sessionId: id }).lean();
        if (initialSession) {
          sendData(initialSession);
        }
      } catch (e) {
        console.error("Initial SSE fetch error:", e);
      }

      // Poll database rapidly to push updates to the open stream. 
      const intervalId = setInterval(async () => {
        if (isClosed) {
          clearInterval(intervalId);
          return;
        }
        try {
          const session = await Session.findOne({ sessionId: id }).lean();
          if (session) {
            sendData(session);
          } else {
            // Keep-alive ping if session is not found
            if (!isClosed) controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          }
        } catch (error) {
          console.error('SSE Polling Error:', error);
        }
      }, 500); // Poll every 500ms

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
      // CRITICAL: Prevents Next.js / Vercel from buffering the SSE stream
      'Content-Encoding': 'none', 
    },
  });
}