from youtube_transcript_api import YouTubeTranscriptApi
import json
import os

VIDEO_ID = '3HHMuaGIC30'
OUT_DIR = os.path.join('artifacts','transcripts')
os.makedirs(OUT_DIR, exist_ok=True)

try:
    transcript = YouTubeTranscriptApi.get_transcript(VIDEO_ID, languages=['en'])
    json_path = os.path.join(OUT_DIR, f'{VIDEO_ID}.json')
    txt_path = os.path.join(OUT_DIR, f'{VIDEO_ID}.txt')
    with open(json_path, 'w', encoding='utf-8') as jf:
        json.dump(transcript, jf, ensure_ascii=False, indent=2)
    # write a simple plain text with timestamps
    with open(txt_path, 'w', encoding='utf-8') as tf:
        for seg in transcript:
            start = seg.get('start')
            dur = seg.get('duration')
            text = seg.get('text').replace('\n',' ')
            tf.write(f'[{start:.2f} - {start+dur:.2f}] {text}\n')
    print('SAVED', json_path, txt_path)
except Exception as e:
    print('ERROR', repr(e))
