import { useState, useEffect } from 'react';
import { X, UserMinus } from 'lucide-react';
import api from '../utils/api';

export default function ManageMembersModal({ shelfId, onClose }) {
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    api.get(`/api/shelves/${shelfId}/members`)
      .then(({ data }) => {
        setOwner(data.owner);
        setMembers(data.members);
      })
      .catch((err) => {
        console.error('Error fetching members:', err);
        alert('Could not load members');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [shelfId, onClose]);

  const handleRemoveMember = async (userId, userName) => {
    const confirmed = window.confirm(
      `Remove ${userName} from this shelf?\n\nThey will lose access immediately.`
    );
    if (!confirmed) return;

    setRemoving(userId);
    try {
      await api.post(`/api/shelves/${shelfId}/remove-member`, { userId });
      setMembers((prev) => prev.filter((m) => m._id !== userId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not remove member');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A2E]">Manage Members</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Control who has access to this shelf
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1A1A2E] transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-[#6B7280]">Loading members...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Owner */}
              {owner && (
                <div className="bg-gradient-to-r from-[#F4845F]/10 to-[#E8617A]/10 rounded-2xl p-4 border border-[#F4845F]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#1A1A2E]">{owner.name}</p>
                      <p className="text-xs text-[#6B7280]">{owner.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#F4845F] bg-white/70 rounded-full px-3 py-1">
                      Owner
                    </span>
                  </div>
                </div>
              )}

              {/* Members */}
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                  Members ({members.length})
                </p>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#6B7280]">No members yet</p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Share this shelf to add members
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => {
                      const isOwner = member._id === owner?._id;
                      if (isOwner) return null; // Don't show owner in members list

                      return (
                        <div
                          key={member._id}
                          className="bg-white/70 rounded-xl p-3 border border-white/80 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-[#1A1A2E] text-sm">
                              {member.name}
                            </p>
                            <p className="text-xs text-[#6B7280]">{member.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member._id, member.name)}
                            disabled={removing === member._id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 transition p-2"
                            title="Remove member"
                          >
                            {removing === member._id ? (
                              <span className="text-xs">Removing...</span>
                            ) : (
                              <UserMinus size={18} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white font-semibold py-3 rounded-2xl hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
