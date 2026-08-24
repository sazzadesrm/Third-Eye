import React, { useState, useEffect } from 'react';
import { X, Save, Camera } from 'lucide-react';
import { User } from '../types';
import { db } from '../lib/db';
import { useAuthStore } from '../lib/store';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, login } = useAuthStore();
  const [formData, setFormData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const updatedUser = { ...user, ...formData } as User;
    await db.users.save(updatedUser);
    
    // Log the change
    await db.auditLogs.add(updatedUser.id, 'Update Profile', 'Users', updatedUser.id, 'User updated their profile.');
    
    // Update global state
    login(updatedUser);
    
    setSaving(false);
    onClose();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-panel rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-text-base">Profile Customization</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-base rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 text-3xl font-bold overflow-hidden border-4 border-bg-panel shadow-sm">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  formData.name?.charAt(0) || 'U'
                )}
              </div>
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Upload</span>
                <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-base">{user.role}</p>
              <p className="text-xs text-text-muted">Role permissions applied globally</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-base mb-1">Display Name</label>
              <input 
                type="text" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-base mb-1">Email Address</label>
              <input 
                type="email" 
                value={formData.email || ''} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
                className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-70">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
