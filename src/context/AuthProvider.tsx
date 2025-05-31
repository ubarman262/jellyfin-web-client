// AuthContext.ts
import { createContext } from "react";
import JellyfinApi from "../api/jellyfin.ts";
import {User, UserLogin} from "../types/jellyfin.ts";

interface AuthContextType {
  api: JellyfinApi | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  jellyfinClient: JellyfinApi | null;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  login: (credentials: UserLogin) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);