import { CommandParser } from "./CommandParser";
import { Message, TextChannel, VoiceConnection } from 'discord.js';
import ytdl from "ytdl-core";
import scdl from "soundcloud-downloader";
import { Readable } from "stream";

interface QueueItem {
  query: string;
  message: Message;
}

let lastTextChannel: TextChannel;
const musicQueue: QueueItem[] = [];
let currentSong: QueueItem = null;
let voiceConnection: VoiceConnection | null = null;

export function singHandler(message: Message, parser: CommandParser<{ link: string }>) {
  parser.executeError(() => {
      this.errorMessage(`Expected link`);
  }).execute(async () => {
    if (!message.member?.voice?.channel) {
      message.reply('Get into a voice channel bruh');
      message.react('❌');
      return;
    }

    if (!voiceConnection) {
      voiceConnection = await message.member.voice.channel.join();
    }

    musicQueue.push({ query: parser.parameters.link, message });
    
    message.react('👍');

    if (!currentSong) {
      playNextSong();
    }
  });
}

async function playNextSong() {
  if (musicQueue.length === 0) {
    disconnect();
    lastTextChannel.send('See ya later nerds :sunglasses:');
    return;
  }

  const { query, message } = currentSong = musicQueue.shift();
  lastTextChannel = message.channel as TextChannel;
  let stream: Readable;
  if (/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/.test(query)) {
    stream = ytdl(query, { filter: 'audioonly' });
  } else if (/^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/.test(query)) {
    stream = await scdl.download(query);
  }
  
  if (stream) {
    voiceConnection.play(stream, { seek: 0, volume: 1 }).on('finish', () => {
      currentSong = null;
      playNextSong();
    })
  } else {
    message.react('❌');
    message.reply('Can\'t find this thing :pensive:')
  }
}

export function skipHandler(message: Message, parser: CommandParser<{ }>) {
  parser.execute(() => {
    message.react('👍');
    currentSong = null;
    playNextSong();
  });
}

export function shutupHandler(message: Message, parser: CommandParser<{ }>) {
  parser.execute(() => {
    disconnect();
    currentSong = null;
    message.reply('Understood :smiling_face_with_tear:');
  });
}

function disconnect() {
  voiceConnection.disconnect();
  musicQueue.length = 0;
  voiceConnection = null;
}