export type Period = 'week' | 'month' | 'year' | 'all';
export type Service = 'spotify' | 'apple_music' | 'lastfm' | 'deezer';

export type PublicUser = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  created_at: string;
};

export type PrivateUser = PublicUser & { email: string };

export type Session = { token: string; user: PrivateUser };

export type Profile = PublicUser & {
  counts: { followers: number; following: number; plays: number };
  is_following: boolean;
  is_self: boolean;
};

export type Totals = { plays: number; minutes: number; artists: number; tracks: number };
export type TopArtist = { name: string; plays: number };
export type TopTrack = { track_id: number; title: string; artist: string; album: string | null; plays: number };
export type TopAlbum = { name: string; artist: string; plays: number };

export type Stats = {
  period: Period;
  totals: Totals;
  top_artists: TopArtist[];
  top_tracks: TopTrack[];
  top_albums: TopAlbum[];
  daily: { day: string; plays: number }[];
};

export type RecentPlay = {
  track_id: number;
  title: string;
  artist: string;
  album: string | null;
  played_at: string;
  service: Service;
};

export type StatsPayload = {
  period: Period;
  totals: Totals;
  top_artists: TopArtist[];
  top_tracks: TopTrack[];
};

export type Post = {
  id: string;
  kind: 'track' | 'stats' | 'text';
  caption: string;
  payload: StatsPayload | null;
  created_at: string;
  author: { username: string; display_name: string };
  track: { id: number; title: string; artist: string; album: string | null } | null;
  likes: number;
  liked_by_me: boolean;
};

export type NewPost =
  | { kind: 'track'; track_id: number; caption: string }
  | { kind: 'stats'; period: Period; caption: string }
  | { kind: 'text'; caption: string };

export type Suggestion = { user: PublicUser; similarity: number; shared_artists: string[] };
export type TasteMatch = { similarity: number; shared_artists: string[] };

export type Scope = 'following' | 'global';
export type BoardEntry = { rank: number; username: string; display_name: string; plays: number; minutes: number };
export type Board = { scope: Scope; period: Period; artist: string | null; entries: BoardEntry[] };

export type ImportRecord = {
  id: string;
  service: Service;
  plays_found: number;
  plays_added: number;
  created_at: string;
};

export type Connections = {
  available: Service[];
  connected: { service: Service; external_id: string; last_synced_at: string | null; last_error: string | null }[];
};

export type Member = { id: string; username: string; display_name: string };

export type Message = {
  id: string;
  conversation_id: string;
  kind: 'text' | 'track' | 'stats';
  body: string;
  payload: StatsPayload | null;
  track: { id: number; title: string; artist: string; album: string | null } | null;
  sender: Member;
  created_at: string;
};

export type Conversation = {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  members: Member[];
  last_message: { kind: Message['kind']; body: string; sender_username: string; created_at: string } | null;
  unread: number;
  created_at: string;
};

export type NewMessage =
  | { kind: 'text'; body: string }
  | { kind: 'track'; track_id: number; body?: string }
  | { kind: 'stats'; period: Period; body?: string };

export type Listening = {
  username: string;
  display_name: string;
  title: string;
  artist: string;
  album: string | null;
  service: Service;
  updated_at: string;
};
