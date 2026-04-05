import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';

export const dynamic = 'force-dynamic';

// GET: Server-Sent Events (SSE) endpoint for real-time streaming
export async function GET(request, { params }) {
  // Await the params object (Required for Next.js 15+)
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  await dbConnect();

  const stream = new ReadableStream({
    async start(controller) {
      let lastTimestamp = 0;

      const interval = setInterval(async () => {
        try {
          const session = await Session.findOne({ sessionId: id }).lean();
          
          if (session && session.timestamp > lastTimestamp) {
            lastTimestamp = session.timestamp;
            const dataStr = `data: ${JSON.stringify(session)}\n\n`;
            controller.enqueue(new TextEncoder().encode(dataStr));
          }
        } catch (error) {
          console.error('SSE Error:', error);
        }
      }, 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}