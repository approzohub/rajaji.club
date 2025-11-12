import { Header } from "./header";

interface AccountHeaderProps {
  activeMenu: string;
  onMenuSelect: (menu: string) => void;
  isSidebarOpen: boolean;
  onSidebarOpen: () => void;
  onSidebarClose: () => void;
}

export function AccountHeader({ activeMenu, onMenuSelect, isSidebarOpen, onSidebarOpen, onSidebarClose }: AccountHeaderProps) {
  return (
    <Header
      activeMenu={activeMenu}
      onMenuSelect={onMenuSelect}
      isSidebarOpen={isSidebarOpen}
      onProfileClick={onSidebarOpen}
      onSidebarClose={onSidebarClose}
    />
  );
} 