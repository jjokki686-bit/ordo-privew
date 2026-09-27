import { createClient } from '@supabase/supabase-js';

// The publishable key identifies the project; authorization belongs to Supabase policies.
const supabase = createClient(
  'https://jkikplybxtfgdejdmfoc.supabase.co',
  'sb_publishable_L6EWdDU0BIUNAbfCbZZ4Sg_BmBH5Z7c',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);

const activeKey = 'ordo_active_user';
const form = document.getElementById('login-form');
const note = document.getElementById('login-note');
const submit = document.getElementById('auth-submit');
const password = document.getElementById('login-password');
const email = document.getElementById('login-email');
const message = text => { note.textContent = text; };

// Keep the original UI and its mode-switching behavior.
const originalSetAuthMode = window.setAuthMode;
window.setAuthMode = function (mode) {
  originalSetAuthMode(mode);
  submit.textContent = mode === 'signup' ? '이메일로 회원가입' : '이메일로 로그인';
  submit.disabled = false;
  message('표시 이름과 사용자 ID를 정해 친구와 연결해 보세요.');
};
window.setAuthMode('signup');
submit.disabled = false;
form.querySelector('.auth-agree').lastChild.textContent = ' 이메일 인증 안내를 확인했습니다.';
const identityFields = document.createElement('div');
identityFields.id = 'auth-profile-fields';
identityFields.innerHTML = '<label for="signup-display-name">표시 이름</label><input id="signup-display-name" class="inp" maxlength="32" autocomplete="nickname" placeholder="친구에게 보일 이름"><label for="signup-username">사용자 ID</label><input id="signup-username" class="inp" maxlength="20" autocomplete="username" autocapitalize="none" placeholder="영문 소문자·숫자·밑줄 3~20자"><small class="c3">이 ID로 친구 요청을 주고받아요.</small>';
document.getElementById('auth-signup-fields').prepend(identityFields);

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const signup = !document.getElementById('auth-signup-fields').hidden;
  const signupName = document.getElementById('signup-display-name').value.trim();
  const signupUsername = document.getElementById('signup-username').value.trim().toLowerCase();
  if (signup && (!signupName || !/^[a-z0-9_]{3,20}$/.test(signupUsername))) {
    message('표시 이름과 영문 사용자 ID(3~20자)를 입력해 주세요.'); return;
  }
  if (signup && password.value !== document.getElementById('signup-confirm').value) {
    message('비밀번호 확인이 일치하지 않아요.');
    return;
  }
  submit.disabled = true;
  message('계정을 확인하고 있어요…');
  try {
    const emailRedirectTo = location.protocol === 'https:' ? location.origin + location.pathname : undefined;
    const result = signup
      ? await supabase.auth.signUp({ email: email.value.trim(), password: password.value,
        options: { data: { display_name: signupName, username: signupUsername }, ...(emailRedirectTo ? { emailRedirectTo } : {}) } })
      : await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    if (result.error) throw result.error;
    password.value = '';
    if (!result.data.session) {
      message('이메일 인증 메일을 확인한 다음 이 화면에서 로그인해 주세요.');
      return;
    }
    localStorage.setItem(activeKey, result.data.session.user.id);
    location.reload();
  } catch (error) {
    message(error?.message || '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.');
  } finally {
    submit.disabled = false;
  }
});

const logout = document.createElement('button');
logout.type = 'button';
logout.className = 'secondary';
logout.textContent = '로그아웃';
logout.hidden = true;
logout.style.cssText = 'margin:20px 16px;min-height:44px;width:calc(100% - 32px)';
document.getElementById('view-me').append(logout);
logout.addEventListener('click', async () => {
  logout.disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    logout.disabled = false;
    showToast('로그아웃을 완료하지 못했어요. 다시 시도해 주세요.');
    return;
  }
  localStorage.removeItem(activeKey);
  location.reload();
});

function mountDirectChat(user) {
  const section = document.getElementById('view-rooms');
  const style = document.createElement('style');
  style.textContent = `
    .ordo-contacts{padding:12px;margin:0 16px 12px;background:var(--surface);border:1px solid var(--line);border-radius:18px}
    .ordo-contacts h3{font-size:14px;font-weight:650;margin:0 0 8px;color:var(--t1)}
    .ordo-contacts p,.ordo-contacts small{font-size:11px;line-height:1.5;color:var(--t2)}
    .ordo-contacts .oc-row{display:flex;gap:7px;align-items:center;margin:8px 0}
    .ordo-contacts input{min-width:0;flex:1;box-sizing:border-box;border:1px solid var(--line);border-radius:11px;background:var(--bg);color:var(--t1);padding:10px;font:inherit;font-size:12px}
    .ordo-contacts button{border:1px solid var(--line);border-radius:11px;background:var(--elev);color:var(--t1);padding:9px 11px;min-height:38px;font:inherit;font-size:12px}
    .ordo-contact-list{display:grid;gap:6px;margin:8px 0}
    .ordo-contact-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--line);color:var(--t1);font-size:12px}
    .ordo-contact-item strong{display:block;font-size:12px}.ordo-contact-item small{display:block}
    .ordo-cloud-chat-status{padding:8px 16px;color:var(--t2);font-size:11px}
  `;
  document.head.append(style);
  const contacts = document.createElement('section');
  contacts.className = 'ordo-contacts';
  contacts.innerHTML = `<h3>내 프로필</h3><form id="ordo-profile-form"><div class="oc-row"><input id="ordo-display-name" maxlength="32" placeholder="표시 이름" aria-label="표시 이름"><input id="ordo-username" maxlength="20" autocapitalize="none" placeholder="사용자 ID" aria-label="사용자 ID"></div><div class="oc-row"><small>친구는 사용자 ID로 검색해 요청을 보낼 수 있어요.</small><button type="submit">저장</button></div></form>
    <h3 style="margin-top:14px">친구 추가</h3><form id="ordo-add-friend" class="oc-row"><input id="ordo-search-user" maxlength="20" autocapitalize="none" placeholder="친구의 사용자 ID" required aria-label="친구 사용자 ID"><button type="submit">요청 보내기</button></form>
    <p id="ordo-contact-status" role="status"></p><h3>친구 요청</h3><div id="ordo-requests" class="ordo-contact-list"></div><h3>친구</h3><div id="ordo-friends" class="ordo-contact-list"></div>`;
  const friendsPanel = document.getElementById('friends-panel');
  const originalRenderRooms = window.renderRooms;
  let currentProfile = null;
  let directRoomChannel = null;
  let directRoomId = null;
  const $ = id => document.getElementById(id);
  const status = text => { $('ordo-contact-status').textContent = text; };
  const profileCache = new Map();
  const originalOpenChat = window.openChat;
  const originalCloseChat = window.closeChat;
  const originalSendChat = window.sendChat;
  const originalRenderChat = window.renderChat;

  async function loadProfile() {
    const { data, error } = await supabase.from('ordo_profiles').select('user_id,username,display_name').eq('user_id', user.id).maybeSingle();
    if (error) { status('프로필 DB 설정이 필요해요. Supabase 프로필·친구 SQL을 실행해 주세요.'); return; }
    if (data) { currentProfile = data; }
    else {
      const username = user.user_metadata?.username || 'ordo' + user.id.replaceAll('-', '').slice(0, 10);
      const display_name = user.user_metadata?.display_name || '새 사용자';
      const result = await supabase.from('ordo_profiles').insert({ user_id: user.id, username, display_name }).select().single();
      if (result.error) { status('프로필을 만들지 못했어요. 사용자 ID가 이미 사용 중인지 확인해 주세요.'); return; }
      currentProfile = result.data;
    }
    profileCache.set(user.id, currentProfile);
    $('ordo-display-name').value = currentProfile.display_name;
    $('ordo-username').value = currentProfile.username;
    if (myProfile.name !== currentProfile.display_name) { myProfile = { ...myProfile, name: currentProfile.display_name }; save(); renderMe(); }
    status('프로필 준비 완료 · @' + currentProfile.username);
  }
  $('ordo-profile-form').onsubmit = async event => {
    event.preventDefault();
    const display_name = $('ordo-display-name').value.trim();
    const username = $('ordo-username').value.trim().toLowerCase();
    if (!display_name || !/^[a-z0-9_]{3,20}$/.test(username)) { status('사용자 ID는 영문 소문자·숫자·밑줄 3~20자로 입력해 주세요.'); return; }
    const { data, error } = await supabase.from('ordo_profiles').upsert({ user_id: user.id, username, display_name, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single();
    if (error) { status(error.code === '23505' ? '이미 사용 중인 ID예요. 다른 ID를 골라 주세요.' : '프로필을 저장하지 못했어요. DB 설정을 확인해 주세요.'); return; }
    currentProfile = data; profileCache.set(user.id, data); myProfile = { ...myProfile, name: display_name }; save(); status('프로필을 저장했어요. @' + username);
    await loadSocial();
  };

  function contactItem(profile, action, label) {
    const row = document.createElement('div'); row.className = 'ordo-contact-item';
    const text = document.createElement('span'); text.innerHTML = '<strong></strong><small></small>';
    text.querySelector('strong').textContent = profile.display_name;
    text.querySelector('small').textContent = '@' + profile.username;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.onclick = action; row.append(text, button); return row;
  }
  async function loadSocial() {
    if (!currentProfile) return;
    const { data: requests, error } = await supabase.from('ordo_friend_requests').select('id,user_a,user_b,requested_by,status').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at', { ascending: false });
    if (error) { status('친구 기능 DB 설정이 필요해요.'); return; }
    const ids = [...new Set(requests.map(r => r.user_a === user.id ? r.user_b : r.user_a))];
    const { data: profiles, error: profileError } = ids.length
      ? await supabase.from('ordo_profiles').select('user_id,username,display_name').in('user_id', ids)
      : { data: [], error: null };
    if (profileError) { status('친구 프로필을 불러오지 못했어요.'); return; }
    profileCache.clear(); profileCache.set(user.id, currentProfile);
    for (const p of profiles) profileCache.set(p.user_id, p);
    const requestsBox = $('ordo-requests'), friendsBox = $('ordo-friends');
    requestsBox.replaceChildren(); friendsBox.replaceChildren();
    let pendingCount = 0, friendCount = 0;
    for (const r of requests) {
      const peerId = r.user_a === user.id ? r.user_b : r.user_a;
      const p = profileCache.get(peerId); if (!p) continue;
      if (r.status === 'accepted') {
        friendCount++;
        friendsBox.append(contactItem(p, () => startDirectChat(p), '채팅'));
      } else if (r.status === 'pending' && r.requested_by !== user.id) {
        pendingCount++;
        requestsBox.append(contactItem(p, async () => {
          const { error } = await supabase.rpc('ordo_respond_friend_request', { p_request_id: r.id, p_accept: true });
          status(error ? '요청을 수락하지 못했어요.' : '친구 요청을 수락했어요.'); if (!error) { await loadSocial(); await loadRooms(); }
        }, '수락'));
      } else if (r.status === 'pending') {
        pendingCount++;
        requestsBox.append(contactItem(p, async () => {
          const { error } = await supabase.rpc('ordo_respond_friend_request', { p_request_id: r.id, p_accept: false });
          status(error ? '요청을 취소하지 못했어요.' : '친구 요청을 취소했어요.'); if (!error) loadSocial();
        }, '취소'));
      }
    }
    if (!requestsBox.children.length) requestsBox.textContent = '새 친구 요청이 없어요.';
    if (!friendsBox.children.length) friendsBox.textContent = '친구 ID를 검색해 요청을 보내 보세요.';
    status(`친구 ${friendCount}명 · 대기 중인 요청 ${pendingCount}개`);
  }
  $('ordo-add-friend').onsubmit = async event => {
    event.preventDefault();
    const username = $('ordo-search-user').value.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { status('사용자 ID 형식을 확인해 주세요.'); return; }
    const button = event.currentTarget.querySelector('button'); button.disabled = true;
    const { data, error } = await supabase.rpc('ordo_request_friend', { p_username: username });
    button.disabled = false;
    if (error) { status(error.message.includes('User not found') ? '해당 ID를 찾지 못했어요.' : error.message.includes('yourself') ? '내 ID는 추가할 수 없어요.' : '친구 요청을 보내지 못했어요.'); return; }
    $('ordo-search-user').value = '';
    status(data === 'accepted' ? '서로 요청을 보내 친구가 되었어요.' : '친구 요청을 보냈어요.');
    await loadSocial(); await loadRooms();
  };

  async function loadRooms() {
    const { data, error } = await supabase.from('ordo_direct_chats').select('id,user_a,user_b,created_at').order('created_at', { ascending: false });
    if (error) { setCloudStatus('채팅 서버 설정을 확인해 주세요.'); return; }
    const peerIds = data.map(r => r.user_a === user.id ? r.user_b : r.user_a);
    if (peerIds.length) {
      const result = await supabase.from('ordo_profiles').select('user_id,username,display_name').in('user_id', peerIds);
      if (!result.error) for (const p of result.data) profileCache.set(p.user_id, p);
    }
    rooms = rooms.filter(r => !r.serverDirect);
    for (const room of data) {
      const peer = room.user_a === user.id ? room.user_b : room.user_a;
      const p = profileCache.get(peer); if (!p) continue;
      const r = { id: room.id, name: p.display_name, desc: '@' + p.username, type: 'normal', color: '#777777', pinned: false, owner: false, members: [myProfile.name || '나', p.display_name], serverDirect: true, peerId: peer };
      rooms.push(r); chats[room.id] = chats[room.id] || [];
    }
    if (navIndex === 2) { originalRenderRooms(); attachFriendsPanel(); }
  }
  function setCloudStatus(text) {
    let el = document.getElementById('ordo-cloud-chat-status');
    if (!el) { el = document.createElement('p'); el.id = 'ordo-cloud-chat-status'; document.getElementById('chats-panel').prepend(el); }
    el.textContent = text;
  }
  function attachFriendsPanel() {
    if (!contacts.isConnected) friendsPanel.prepend(contacts);
    loadSocial();
  }
  window.renderRooms = function(...args) { const result = originalRenderRooms.apply(this, args); attachFriendsPanel(); return result; };

  async function startDirectChat(profile) {
    const { data, error } = await supabase.rpc('ordo_open_direct_chat', { other_user: profile.user_id });
    if (error) { status('먼저 친구 요청을 수락해 주세요.'); return; }
    await loadRooms();
    window.openChat(data, profile);
  }
  const baseOpenChat = originalOpenChat;
  window.openChat = async function(id, suppliedProfile) {
    const room = rooms.find(r => r.id === id);
    if (!room?.serverDirect) { if (directRoomChannel) supabase.removeChannel(directRoomChannel); directRoomChannel = null; directRoomId = null; document.getElementById('chatroom').classList.remove('ordo-direct-mode'); return baseOpenChat(id); }
    if (directRoomChannel) await supabase.removeChannel(directRoomChannel);
    directRoomChannel = null; directRoomId = id;
    const profile = suppliedProfile || profileCache.get(room.peerId);
    room.name = profile?.display_name || room.name;
    document.getElementById('chatroom').classList.add('ordo-direct-mode');
    baseOpenChat(id);
    document.getElementById('chat-name').textContent = room.name;
    document.getElementById('chat-kind').textContent = '친구';
    document.getElementById('chat-members').textContent = '2';
    document.getElementById('chatroom').classList.add('ordo-direct-mode');
    const { data: messages, error } = await supabase.from('ordo_messages').select('id,chat_id,sender_id,body,created_at').eq('chat_id', id).order('created_at', { ascending: true }).limit(100);
    if (!error && directRoomId === id) {
      chats[id] = messages.map(m => ({ id: m.id, who: m.sender_id === user.id ? 'me' : room.name, text: m.body, ts: new Date(m.created_at).getTime() }));
      originalRenderChat();
    }
    directRoomChannel = supabase.channel('ordo-chat-' + id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ordo_messages', filter: 'chat_id=eq.' + id }, payload => {
      if (directRoomId !== id || chats[id]?.some(m => m.id === payload.new.id)) return;
      chats[id] = chats[id] || [];
      chats[id].push({ id: payload.new.id, who: payload.new.sender_id === user.id ? 'me' : room.name, text: payload.new.body, ts: new Date(payload.new.created_at).getTime() });
      if (openChatId === id) originalRenderChat();
      originalRenderRooms();
    }).subscribe();
  };
  window.closeChat = function(...args) {
    if (directRoomChannel) supabase.removeChannel(directRoomChannel);
    directRoomChannel = null; directRoomId = null;
    document.getElementById('chatroom').classList.remove('ordo-direct-mode');
    return originalCloseChat.apply(this, args);
  };
  window.sendChat = async function() {
    const room = rooms.find(r => r.id === openChatId);
    if (!room?.serverDirect) return originalSendChat();
    const input = document.getElementById('chat-input'), body = input.value.trim();
    if (!body) return;
    input.disabled = true;
    const { data, error } = await supabase.from('ordo_messages').insert({ chat_id: room.id, sender_id: user.id, body }).select('id,chat_id,sender_id,body,created_at').single();
    input.disabled = false;
    if (error) { showToast('메시지를 보내지 못했어요. 다시 시도해 주세요.'); return; }
    input.value = '';
    chats[room.id] = chats[room.id] || [];
    if (!chats[room.id].some(m => m.id === data.id)) chats[room.id].push({ id: data.id, who: 'me', text: data.body, ts: new Date(data.created_at).getTime() });
    originalRenderChat(); originalRenderRooms();
  };

  const oldSetRoomTab = window.setRoomTab;
  window.setRoomTab = function(tab) { const r = oldSetRoomTab(tab); if (tab === 'friends') attachFriendsPanel(); if (tab === 'chats') loadRooms(); return r; };
  window.addEventListener('ordo:viewchange', () => { if (navIndex === 2) loadRooms(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadSocial(); loadRooms(); if (directRoomId) window.openChat(directRoomId); } });
  loadProfile().then(() => { loadSocial(); loadRooms(); });
}
async function connectAccountState(user) {
  const badge = document.createElement('p');
  badge.setAttribute('role', 'status');
  badge.style.cssText = 'padding:12px 16px;font-size:12px;color:var(--t2)';
  document.getElementById('view-me').append(badge);
  const indicate = message => { badge.textContent = '계정 데이터 · ' + message; };
  const fields = ['cats', 'tasks', 'rooms', 'chats', 'friends', 'myProfile', 'scheduledMessages'];
  const snapshot = () => ({
    cats: categories, tasks, rooms, chats, friends, myProfile, scheduledMessages
  });
  function apply(data) {
    if (Array.isArray(data.cats)) categories = data.cats;
    if (Array.isArray(data.tasks)) tasks = data.tasks;
    if (Array.isArray(data.rooms)) rooms = data.rooms;
    if (data.chats && typeof data.chats === 'object') chats = data.chats;
    if (Array.isArray(data.friends)) friends = data.friends;
    if (data.myProfile && typeof data.myProfile === 'object') myProfile = data.myProfile;
    if (Array.isArray(data.scheduledMessages)) scheduledMessages = data.scheduledMessages;
    for (const field of fields) {
      const value = field === 'cats' ? categories : field === 'myProfile' ? myProfile :
        field === 'tasks' ? tasks : field === 'rooms' ? rooms : field === 'chats' ? chats :
        field === 'friends' ? friends : scheduledMessages;
      LS.set(field, value);
    }
  }
  const pendingKey = 'ordo_pending_' + user.id;
  let generation = 0;
  let timer = null;
  let writing = false;
  async function flush() {
    if (writing) return;
    writing = true;
    const current = generation;
    try {
      indicate('저장 중…');
      const payload = snapshot();
      const { error } = await supabase.from('ordo_account_state').upsert({
        user_id: user.id, data: payload, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      if (current === generation) {
        localStorage.removeItem(pendingKey);
        indicate('서버에 저장됨');
      }
    } catch {
      indicate('저장 실패 · 연결 후 다시 시도');
    } finally {
      writing = false;
      if (current !== generation) timer = setTimeout(flush, 500);
    }
  }
  window.ORDO_CLOUD = { queue() {
    localStorage.setItem(pendingKey, '1');
    generation++;
    clearTimeout(timer);
    timer = setTimeout(flush, 500);
  } };
  const { data, error } = await supabase.from('ordo_account_state')
    .select('data').eq('user_id', user.id).maybeSingle();
  if (error) {
    indicate('DB 연결 대기 · Supabase SQL 설정 필요');
    return;
  }
  if (localStorage.getItem(pendingKey)) {
    // An offline local edit takes precedence on reconnect (last writer wins).
    generation++;
    await flush();
  } else if (data?.data) {
    apply(data.data);
    indicate('서버에서 불러옴');
  } else {
    generation++;
    await flush();
  }
}

// Verify the stored session before opening an account on app launch.
(async () => {
  const { data, error } = await supabase.auth.getUser();
  const id = !error && data.user?.id;
  if (!id) {
    if (localStorage.getItem(activeKey)) {
      localStorage.removeItem(activeKey);
      location.reload();
    }
    return;
  }
  if (localStorage.getItem(activeKey) !== id) {
    localStorage.setItem(activeKey, id);
    location.reload();
    return;
  }
  logout.hidden = false;
  await connectAccountState(data.user);
  window.enterPreview();
  mountDirectChat(data.user);
})().catch(() => message('연결 상태를 확인할 수 없어요. 네트워크를 확인해 주세요.'));
