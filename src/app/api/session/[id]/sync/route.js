import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';

export const dynamic = 'force-dynamic';

// GET: Check if a session exists (used when joining)
export async function GET(request) {
  await dbConnect();

  // PASSIVE CLEANUP: Automatically clears database of stale or abandoned rooms
  // 1. Destroys sessions completely inactive for 12 hours.
  // 2. Destroys empty sessions after 2 minutes (allows users to safely refresh the page without killing the room).
  try {
    await Session.deleteMany({
      $or: [
        { timestamp: { $lt: Date.now() - 12 * 60 * 60 * 1000 } },
        { members: { $size: 0 }, timestamp: { $lt: Date.now() - 2 * 60 * 1000 } }
      ]
    });
  } catch (e) {
    console.error("Cleanup error:", e);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const session = await Session.findOne({ sessionId: id });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true, session });
}

// POST: Create a new party session
export async function POST(request) {
  await dbConnect();
  try {
    const data = await request.json();
    const session = await Session.create({
      ...data,
      // Use 'system' so the creator's frontend doesn't debounce the initial member load
      updatedBy: 'system', 
      timestamp: Date.now()
    });
    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update party state (Join, Leave, Play, Pause, Seek, Queue)
export async function PUT(request) {
  await dbConnect();
  try {
    const { action, sessionId, userId, userProfile, updates } = await request.json();
    
    if (action === 'join') {
      await Session.findOneAndUpdate(
        { sessionId },
        { 
          $addToSet: { members: userProfile },
          // 'system' prevents the frontend from ignoring this critical metadata update
          $set: { updatedBy: 'system', timestamp: Date.now() }
        }
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'leave') {
      await Session.findOneAndUpdate(
        { sessionId },
        { 
          $pull: { members: { id: userProfile.id } },
          // 'system' prevents the frontend from ignoring this critical metadata update
          $set: { updatedBy: 'system', timestamp: Date.now() }
        }
      );
      return NextResponse.json({ success: true });
    }

    await Session.findOneAndUpdate(
      { sessionId },
      { 
        $set: { 
          ...updates, 
          updatedBy: userId, 
          timestamp: Date.now() 
        } 
      }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}