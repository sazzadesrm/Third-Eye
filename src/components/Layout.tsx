import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { HelpKnowledgeBaseDrawer } from './HelpKnowledgeBaseDrawer';
import { BackupReminderPrompt } from './BackupReminderPrompt';
import { QRScannerModal } from './QRScannerModal';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';

export const Layout: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  useGlobalShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenShortcutsHelp: () => setIsShortcutsHelpOpen(true),
    onOpenHelpDrawer: () => setIsHelpDrawerOpen(true),
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar 
        onOpenHelp={() => setIsHelpDrawerOpen(true)} 
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
          onOpenHelpDrawer={() => setIsHelpDrawerOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
        onOpenHelpDrawer={() => setIsHelpDrawerOpen(true)}
      />

      {/* Shortcuts Cheat Sheet */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />

      {/* Help & Knowledge Base Drawer */}
      <HelpKnowledgeBaseDrawer
        isOpen={isHelpDrawerOpen}
        onClose={() => setIsHelpDrawerOpen(false)}
        onOpenShortcutsHelp={() => {
          setIsHelpDrawerOpen(false);
          setIsShortcutsHelpOpen(true);
        }}
      />

      {/* Scheduled Backup Toast Notification / Modal */}
      <BackupReminderPrompt />
    </div>
  );
};


