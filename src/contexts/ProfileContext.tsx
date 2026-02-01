import { createContext, useContext } from "react";

const ProfileContext = createContext<string | null>(null);

export function ProfileProvider({
  profileId,
  children,
}: {
  profileId: string;
  children: React.ReactNode;
}) {
  return (
    <ProfileContext.Provider value={profileId}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileId(): string {
  const profileId = useContext(ProfileContext);
  if (!profileId) {
    throw new Error("useProfileId must be used within a ProfileProvider");
  }
  return profileId;
}
