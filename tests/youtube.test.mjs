import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../app/youtube.js', import.meta.url), 'utf8');
const youtube = runInNewContext(source + '\ngoopYouTube;', {URL});
const video = 'jNQXAC9IVRw';
const watch = 'https://www.youtube.com/watch?v=' + video;

test('YouTube sign-in goes to an official page while ordinary browsing continues', () => {
  for (const target of ['/signin', 'https://accounts.google.com/v3/signin/identifier', 'https://accounts.google.com/ServiceLogin?service=youtube']) {
    assert.ok(youtube.isSignIn(target,watch));
  }
  for (const target of ['/results?search_query=test', 'https://accounts.google.com/gsi/iframe/select', 'https://accounts.google.com.example.com/signin']) {
    assert.equal(youtube.isSignIn(target,watch), false);
  }
  assert.equal(youtube.isSignIn('https://accounts.google.com/ServiceLogin', 'https://example.org'), false);
});

test('the official return address uses only a validated YouTube video ID', () => {
  for (const page of [watch, 'https://youtu.be/'+video, 'https://m.youtube.com/shorts/'+video]) {
    const link = new URL(youtube.official(youtube.video(page)));
    assert.equal(link.origin, 'https://www.youtube.com');
    assert.equal(link.searchParams.get('next'), '/watch?v='+video);
  }
  assert.equal(youtube.video('https://youtube.com.example.org/watch?v='+video), '');
  assert.equal(youtube.video(youtube.official(video)), video);
  assert.equal(youtube.video('https://www.youtube.com/signin?next=https://example.org/watch?v='+video), '');
  assert.equal(youtube.official('https://example.org'), 'https://www.youtube.com/signin');
});
