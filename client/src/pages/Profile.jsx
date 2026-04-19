import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Settings, Sparkles, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const VIBE_COLORS = {
  Educational:   'bg-blue-100 text-blue-700',
  HighSignal:    'bg-green-100 text-green-700',
  Chaotic:       'bg-orange-100 text-orange-700',
  Cursed:        'bg-purple-100 text-purple-700',
  Inspirational: 'bg-pink-100 text-pink-700',
  Entertainment: 'bg-red-100 text-red-700',
  Shopping:      'bg-yellow-100 text-yellow-700',
  News:          'bg-indigo-100 text-indigo-700',
  Technology:    'bg-cyan-100 text-cyan-700',
  Design:        'bg-fuchsia-100 text-fuchsia-700',
  Business:      'bg-emerald-100 text-emerald-700',
  Lifestyle:     'bg-rose-100 text-rose-700',
  Creative:      'bg-violet-100 text-violet-700',
  Research:      'bg-teal-100 text-teal-700',
  Tools:         'bg-slate-100 text-slate-700',
};

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const { userId: viewedUserId } = useParams();
  const avatarInputRef = useRef(null);
  const [shelves, setShelves] = useState([]);
  const [friends, setFriends] = useState([]);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedProfileLoading, setViewedProfileLoading] = useState(false);
  const [viewedProfileError, setViewedProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    telegramId: '',
    defaultShelfId: '',
    curatorArchetypeName: '',
    curatorArchetypeDescription: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [deleteForm, setDeleteForm] = useState({
    currentPassword: '',
    confirmation: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      telegramId: user.telegramId || '',
      defaultShelfId: user.defaultShelfId || '',
      curatorArchetypeName: user.curatorArchetype?.name || '',
      curatorArchetypeDescription: user.curatorArchetype?.description || '',
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/shelves/mine')
      .then(({ data }) => {
        if (!cancelled) setShelves(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setShelves([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/social/friends')
      .then(({ data }) => {
        if (cancelled) return;
        setFriends(Array.isArray(data?.friends) ? data.friends : []);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const targetUserId = String(viewedUserId || '').trim();

    if (!targetUserId || !user?._id || targetUserId === String(user._id)) {
      setViewedProfile(null);
      setViewedProfileLoading(false);
      setViewedProfileError('');
      return undefined;
    }

    setViewedProfileLoading(true);
    setViewedProfileError('');

    api.get(`/api/social/users/${targetUserId}`)
      .then(({ data }) => {
        if (!cancelled) setViewedProfile(data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setViewedProfile(null);
          setViewedProfileError(err?.response?.data?.message || 'Could not load that profile.');
        }
      })
      .finally(() => {
        if (!cancelled) setViewedProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?._id, viewedUserId]);

  if (!user) return null;

  const isViewingFriendProfile = Boolean(viewedUserId && String(viewedUserId) !== String(user._id));
  const archetype = user.curatorArchetype || { name: 'Fresh Soul', description: 'You just started curating.' };
  const stats = user.vibeStats || {};
  const initial = user.name?.charAt(0).toUpperCase() || '?';
  const defaultShelfName = shelves.find((shelf) => String(shelf._id) === String(user.defaultShelfId || ''))?.name || 'No default shelf';
  const friendPreview = friends.slice(0, 6);
  const resolveAssetUrl = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    const origin = String(api.defaults.baseURL || '').replace(/\/$/, '');
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return origin ? `${origin}${path}` : raw;
  };

  const avatarSrc = !avatarLoadFailed ? resolveAssetUrl(user.avatarUrl) : null;

  if (isViewingFriendProfile) {
    if (viewedProfileLoading) {
      return (
        <Layout>
          <div className="flex min-h-[50vh] items-center justify-center text-[#6B7280]">
            Loading friend profile...
          </div>
        </Layout>
      );
    }

    if (viewedProfileError) {
      return (
        <Layout>
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm theme-muted">{viewedProfileError}</p>
            <button
              onClick={() => navigate('/profile')}
              className="theme-button-secondary rounded-full px-4 py-2 text-sm font-semibold"
            >
              Back to my profile
            </button>
          </div>
        </Layout>
      );
    }

    if (!viewedProfile) return null;

    const friendArchetype = viewedProfile.curatorArchetype || { name: 'Fresh Soul', description: 'You just started curating.' };
    const friendStats = viewedProfile.vibeStats || {};
    const friendInitial = viewedProfile.name?.charAt(0).toUpperCase() || '?';
    const friendAvatarSrc = resolveAssetUrl(viewedProfile.avatarUrl);
    const friendDefaultShelfName = viewedProfile.defaultShelfName || 'No default shelf';
    const friendStatTotal = Object.values(friendStats).reduce((sum, value) => sum + Number(value || 0), 0);

    return (
      <Layout>
        <div className="flex flex-col gap-8 max-w-4xl">
          <div className="theme-card rounded-[28px] p-6 shadow-xl overflow-hidden">
            <div className="theme-card-content flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="theme-subtle-label font-semibold">Friend Profile</p>
                  <h1 className="theme-hero-title text-3xl font-bold">{viewedProfile.name}'s shelf identity</h1>
                </div>

                <button
                  onClick={() => navigate('/profile')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-white/75 border border-white/70 text-[#20314d]"
                >
                  Back to my profile
                </button>
              </div>

              <div className="grid gap-4 items-stretch">
                <div className="rounded-[24px] p-5 bg-gradient-to-br from-white/70 via-white/55 to-[#f7fbff] border border-white/70 shadow-sm">
                  <div className="flex items-center gap-4">
                    {friendAvatarSrc ? (
                      <img
                        src={friendAvatarSrc}
                        alt="Profile"
                        className="w-20 h-20 rounded-[20px] object-cover shadow-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#F4845F] to-[#E8617A] flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                        {friendInitial}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-[#20314d]">{viewedProfile.name}</h2>
                      <p className="text-sm theme-muted break-all">{viewedProfile.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4845F] bg-white/80 border border-white/80 rounded-full px-3 py-1">
                        <Sparkles size={12} />
                        {friendArchetype.name}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm theme-muted mt-4 leading-relaxed">{friendArchetype.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/80 px-3 py-1 text-xs font-semibold text-[#20314d]">
                      <Users size={12} />
                      {viewedProfile.friendCount || 0} friends
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/80 px-3 py-1 text-xs font-semibold text-[#20314d]">
                      <Sparkles size={12} />
                      {friendStatTotal} vibe points
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/80 px-3 py-1 text-xs font-semibold text-[#20314d]">
                      Default: {friendDefaultShelfName}
                    </span>
                  </div>
                </div>

                <div className="theme-panel rounded-[24px] p-6 shadow-lg">
                  <p className="theme-card-content text-sm font-semibold mb-4">Vibe distribution</p>
                  {Object.values(friendStats).every((v) => Number(v || 0) === 0) ? (
                    <p className="text-xs theme-muted">No vibe data yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(friendStats).map(([key, value]) => (
                        <div
                          key={key}
                          className={`rounded-2xl px-4 py-2 flex items-center gap-2 border border-white/60 shadow-sm ${VIBE_COLORS[key] || 'bg-white/60 text-gray-700'}`}
                        >
                          <span className="text-xs font-medium">{key}</span>
                          <span className="text-sm font-bold">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileMessage('');

      const payload = {
        name: form.name,
        email: form.email,
        telegramId: form.telegramId,
        defaultShelfId: form.defaultShelfId || null,
        curatorArchetypeName: form.curatorArchetypeName,
        curatorArchetypeDescription: form.curatorArchetypeDescription,
      };

      const { data } = await api.patch('/api/auth/me', payload);
      const token = localStorage.getItem('shelflife_token');
      if (token) login(token, data);
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileMessage(err?.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordMessage('');

      await api.patch('/api/auth/me', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password updated successfully.');
    } catch (err) {
      setPasswordMessage(err?.response?.data?.message || 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const updateAuthUser = (nextUser) => {
    const token = localStorage.getItem('shelflife_token');
    if (token) login(token, nextUser);
  };

  const handleAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarMessage('Please choose an image file.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setAvatarMessage('Image size must be 4MB or smaller.');
      return;
    }

    try {
      setUploadingAvatar(true);
      setAvatarMessage('');

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image file'));
        reader.readAsDataURL(file);
      });

      const { data } = await api.patch('/api/auth/me', { avatarDataUrl: dataUrl });
      updateAuthUser(data);
      setAvatarLoadFailed(false);
      setAvatarMessage('Profile photo updated.');
    } catch (err) {
      setAvatarMessage(err?.response?.data?.message || 'Could not update profile photo.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      setAvatarMessage('');

      const { data } = await api.patch('/api/auth/me', { avatarUrl: null });
      updateAuthUser(data);
      setAvatarLoadFailed(false);
      setAvatarMessage('Profile photo removed.');
    } catch (err) {
      setAvatarMessage(err?.response?.data?.message || 'Could not remove profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteForm.confirmation !== 'DELETE') {
      setDeleteMessage('Type DELETE exactly to confirm account deletion.');
      return;
    }

    if (!deleteForm.currentPassword) {
      setDeleteMessage('Current password is required to delete your account.');
      return;
    }

    try {
      setDeletingAccount(true);
      setDeleteMessage('');

      await api.delete('/api/auth/me', {
        data: {
          currentPassword: deleteForm.currentPassword,
          confirmation: deleteForm.confirmation,
        },
      });

      logout();
      navigate('/register');
    } catch (err) {
      setDeleteMessage(err?.response?.data?.message || 'Could not delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-4xl">
        <div className="theme-card rounded-[28px] p-6 shadow-xl overflow-hidden">
          <div className="theme-card-content flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="theme-subtle-label font-semibold">Curator Profile</p>
                <h1 className="theme-hero-title text-3xl font-bold">Your shelf identity</h1>
              </div>

              <div className="relative">
                <button
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  className="w-11 h-11 rounded-full bg-white/75 border border-white/80 shadow-sm flex items-center justify-center text-[#20314d]"
                  aria-label="Open profile settings"
                  title="Profile settings"
                >
                  <Settings size={18} />
                </button>

                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/80 bg-white/90 shadow-xl p-2 z-10">
                    <button onClick={() => { setActivePanel('photo'); setSettingsOpen(false); }} className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-[#20314d] hover:bg-[#edf3ff]">Upload Photo</button>
                    <button onClick={() => { setActivePanel('edit'); setSettingsOpen(false); }} className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-[#20314d] hover:bg-[#edf3ff]">Edit Profile</button>
                    <button onClick={() => { setActivePanel('security'); setSettingsOpen(false); }} className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-[#20314d] hover:bg-[#edf3ff]">Security</button>
                    <button onClick={() => { setActivePanel('danger'); setSettingsOpen(false); }} className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-[#8a2232] hover:bg-red-100/70">Delete Account</button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[320px_1fr] items-stretch">
              <div className="rounded-[24px] p-5 bg-gradient-to-br from-white/70 via-white/55 to-[#f7fbff] border border-white/70 shadow-sm">
                <div className="flex items-center gap-4">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      onError={() => {
                        setAvatarLoadFailed(true);
                        setAvatarMessage('Could not load profile image. Try uploading again.');
                      }}
                      className="w-20 h-20 rounded-[20px] object-cover shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#F4845F] to-[#E8617A] flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                      {initial}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-[#20314d]">{user.name}</h2>
                    <p className="text-sm theme-muted break-all">{user.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4845F] bg-white/80 border border-white/80 rounded-full px-3 py-1">
                      <Sparkles size={12} />
                      {archetype.name}
                    </div>
                  </div>
                </div>

                <p className="text-sm theme-muted mt-4 leading-relaxed">{archetype.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/80 px-3 py-1 text-xs font-semibold text-[#20314d]">
                    <Users size={12} />
                    {friends.length} friends
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/80 px-3 py-1 text-xs font-semibold text-[#20314d]">
                    <Sparkles size={12} />
                    {Object.values(stats).reduce((sum, value) => sum + Number(value || 0), 0)} vibe points
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/80 px-3 py-1 text-xs font-semibold text-[#20314d]">
                    Default: {defaultShelfName}
                  </span>
                </div>

                <button
                  onClick={() => navigate('/discover')}
                  className="mt-4 theme-button rounded-full px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <MessageCircle size={15} />
                  Go to Discover
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-white/55 border border-white/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Profile Snapshot</p>
                      <p className="text-sm font-semibold text-[#20314d] mt-0.5">Quick identity check</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#F4845F]">
                      <Sparkles size={12} />
                      Live
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/70 border border-white/70 px-3 py-3">
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Name</p>
                      <p className="text-sm font-semibold text-[#20314d] mt-0.5">{user.name || 'Not set'}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 border border-white/70 px-3 py-3">
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Friends</p>
                      <p className="text-sm font-semibold text-[#20314d] mt-0.5">{friends.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 border border-white/70 px-3 py-3">
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Telegram ID</p>
                      <p className="text-sm font-semibold text-[#20314d] mt-0.5">{user.telegramId || 'Not linked'}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 border border-white/70 px-3 py-3">
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Default Shelf</p>
                      <p className="text-sm font-semibold text-[#20314d] mt-0.5 line-clamp-1">{defaultShelfName}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white/55 border border-white/70 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Network Pulse</p>
                      <p className="text-sm font-semibold text-[#20314d] mt-0.5">Your social circle</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#5f7498]">
                      <Users size={12} />
                      {friends.length} total
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-gradient-to-br from-[#F4845F]/10 to-white/75 border border-white/70 p-3">
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Vibe points</p>
                      <p className="text-lg font-bold text-[#20314d] mt-0.5">
                        {Object.values(stats).reduce((sum, value) => sum + Number(value || 0), 0)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-[#7c8cff]/10 to-white/75 border border-white/70 p-3">
                      <p className="text-[11px] theme-muted uppercase tracking-wide">Shelves</p>
                      <p className="text-lg font-bold text-[#20314d] mt-0.5">{shelves.length}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/70 border border-white/70 p-3 flex-1 flex flex-col gap-2 min-h-[150px]">
                    <p className="text-[11px] theme-muted uppercase tracking-wide">Friend spotlight</p>
                    {friendPreview.length === 0 ? (
                      <p className="text-sm theme-muted leading-relaxed">Add a friend from Discover and they’ll show up here.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {friendPreview.map((friend) => (
                          <div key={friend._id} className="flex items-center justify-between gap-2 rounded-2xl bg-white/80 border border-white/70 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#20314d] truncate">{friend.name}</p>
                              <p className="text-[11px] theme-muted truncate">{friend.email}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/profile/${friend._id}`)}
                              className="theme-button-secondary rounded-full px-3 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Users size={12} />
                              View Profile
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {activePanel === 'photo' && (
          <div className="theme-card rounded-[24px] p-6 shadow-xl flex flex-col gap-4">
            <div className="theme-card-content flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#20314d]">Photo Settings</h3>
                <p className="text-sm theme-muted mt-1">Upload or remove your profile image.</p>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white/75 border border-white/70 text-[#20314d]"
              >
                Close
              </button>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelected}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="theme-button-secondary rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-70"
              >
                {uploadingAvatar ? 'Uploading...' : 'Choose and Upload'}
              </button>
              {avatarSrc && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white/75 border border-white/70 text-[#20314d] disabled:opacity-70"
                >
                  Remove Photo
                </button>
              )}
              <p className="text-xs theme-muted">{avatarMessage}</p>
            </div>
          </div>
        )}

        {activePanel === 'edit' && (
          <div className="theme-card rounded-[24px] p-6 shadow-xl flex flex-col gap-5">
            <div className="theme-card-content flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#20314d]">Edit Profile</h3>
                <p className="text-sm theme-muted mt-1">Update your account details and preferred shelf.</p>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white/75 border border-white/70 text-[#20314d]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">Telegram ID</span>
                <input
                  value={form.telegramId}
                  onChange={(e) => setForm((prev) => ({ ...prev, telegramId: e.target.value }))}
                  placeholder="Get from bot: /start"
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
                <span className="text-[10px] theme-muted mt-0.5">Message your bot to get your Telegram ID</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">Default Shelf</span>
                <select
                  value={form.defaultShelfId}
                  onChange={(e) => setForm((prev) => ({ ...prev, defaultShelfId: e.target.value }))}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                >
                  <option value="">No default shelf</option>
                  {shelves.map((shelf) => (
                    <option key={shelf._id} value={shelf._id}>{shelf.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs theme-muted">Archetype Name</span>
                <input
                  value={form.curatorArchetypeName}
                  onChange={(e) => setForm((prev) => ({ ...prev, curatorArchetypeName: e.target.value }))}
                  placeholder="Example: Knowledge Librarian"
                  maxLength={80}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs theme-muted">Archetype Description</span>
                <textarea
                  value={form.curatorArchetypeDescription}
                  onChange={(e) => setForm((prev) => ({ ...prev, curatorArchetypeDescription: e.target.value }))}
                  placeholder="Describe your curation style"
                  maxLength={280}
                  rows={3}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none resize-y"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs theme-muted">{profileMessage}</p>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="theme-button rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {activePanel === 'security' && (
          <div className="theme-card rounded-[24px] p-6 shadow-xl flex flex-col gap-5">
            <div className="theme-card-content flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#20314d]">Security</h3>
                <p className="text-sm theme-muted mt-1">Change your account password.</p>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white/75 border border-white/70 text-[#20314d]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">Current Password</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">New Password</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs theme-muted">Confirm Password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs theme-muted">{passwordMessage}</p>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="theme-button-secondary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70"
              >
                {changingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}

        <div className="theme-panel rounded-[24px] p-6 shadow-lg">
          <p className="theme-card-content text-sm font-semibold mb-4">Your vibe distribution</p>
          {Object.values(stats).every((v) => v === 0) ? (
            <p className="text-xs theme-muted">Save a few links first to see your vibe breakdown.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded-2xl px-4 py-2 flex items-center gap-2 border border-white/60 shadow-sm ${VIBE_COLORS[key] || 'bg-white/60 text-gray-700'}`}
                >
                  <span className="text-xs font-medium">{key}</span>
                  <span className="text-sm font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {activePanel === 'danger' && (
          <div className="theme-card rounded-[24px] p-6 shadow-xl flex flex-col gap-5 border border-red-200/70 bg-red-50/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#8a2232]">Danger Zone</h3>
                <p className="text-sm text-[#8a2232]/80 mt-1">
                  Permanently delete your account and all owned shelves, links, comments, invites, and notifications.
                </p>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold bg-white/75 border border-red-200 text-[#8a2232]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#8a2232]/80">Current Password</span>
                <input
                  type="password"
                  value={deleteForm.currentPassword}
                  onChange={(e) => setDeleteForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="rounded-xl bg-white/80 border border-red-200 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#8a2232]/80">Type DELETE to confirm</span>
                <input
                  value={deleteForm.confirmation}
                  onChange={(e) => setDeleteForm((prev) => ({ ...prev, confirmation: e.target.value }))}
                  className="rounded-xl bg-white/80 border border-red-200 px-3 py-2 text-sm text-[#20314d] outline-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#8a2232]/80">{deleteMessage}</p>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-[#bf334c] text-white hover:bg-[#ab2b43] disabled:opacity-70"
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
