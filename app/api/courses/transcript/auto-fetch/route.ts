import { NextRequest, NextResponse } from 'next/server';
import { requireAdminResponse } from '@/lib/auth/admin';
import { fetchYouTubeTranscriptCues } from '@/lib/services/youtube-transcript';
import { formatTranscriptCues } from '@/lib/utils/transcript';

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const body = await request.json().catch(() => null);
    const videoUrl = body?.videoUrl;

    if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.length > 2_048) {
      return NextResponse.json({ error: 'Please enter a valid YouTube video URL.' }, { status: 400 });
    }

    const cues = await fetchYouTubeTranscriptCues(videoUrl);
    const formattedText = formatTranscriptCues(cues);

    return NextResponse.json({
      cues,
      count: cues.length,
      formattedText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'INVALID_YOUTUBE_URL') {
      return NextResponse.json({ error: 'Enter a valid YouTube URL or 11-character video ID.' }, { status: 400 });
    }
    if (message === 'YOUTUBE_TRANSCRIPT_EMPTY') {
      return NextResponse.json({ error: 'No captions found for this YouTube video.' }, { status: 404 });
    }
    if (message === 'YOUTUBE_TRANSCRIPT_DISABLED') {
      return NextResponse.json({ error: 'Captions are disabled for this YouTube video. Import an SRT or VTT file instead.' }, { status: 404 });
    }
    if (message === 'YOUTUBE_VIDEO_UNAVAILABLE') {
      return NextResponse.json({ error: 'This YouTube video is private, removed, or unavailable.' }, { status: 404 });
    }
    if (message === 'YOUTUBE_REQUEST_BLOCKED') {
      return NextResponse.json(
        {
          error:
            "YouTube blocked this server's caption request (bot check). This is common on cloud hosts and is not about the video's captions. Set YOUTUBE_PROXY_URL on the server, or open the video's \"Show transcript\" panel on YouTube and paste it into the transcript box.",
        },
        { status: 502 },
      );
    }
    if (message === 'YOUTUBE_PROXY_MISCONFIGURED') {
      return NextResponse.json(
        { error: 'YOUTUBE_PROXY_URL is not a valid proxy URL. Expected http://user:pass@host:port.' },
        { status: 500 },
      );
    }
    if (message === 'YOUTUBE_RATE_LIMITED') {
      return NextResponse.json({ error: 'YouTube is rate-limiting requests. Try again in a few minutes.' }, { status: 429 });
    }
    console.error('Auto-fetch YouTube transcript error:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript from YouTube.' }, { status: 502 });
  }
}
