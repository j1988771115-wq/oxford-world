export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor: string | CourseInstructor;
  price: number; // NTD, 0 = free
  originalPrice?: number;
  rating?: number;
  students?: string;
  isFreePreview: boolean;
  thumbnailUrl?: string;
  thumbnail?: string;
  category: string;
  level?: "Foundational" | "Intermediate" | "Advanced" | "Specialized";
  muxPlaybackId?: string;
  createdAt?: string;
}

export interface CourseInstructor {
  name: string;
  title: string;
  avatar: string;
}

export interface Milestone {
  id: string;
  phase: string;
  title: string;
  description: string;
  status: "completed" | "current" | "locked";
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  avatarColor: string;
}

export interface UserProfile {
  id: string;
  authId: string;
  email: string;
  displayName?: string;
  tier: "free" | "pro";
  discordId?: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string;
  createdAt: string;
}

export interface CourseAccess {
  userId: string;
  courseId: string;
  accessType: "purchased" | "subscription";
  grantedAt: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
}
