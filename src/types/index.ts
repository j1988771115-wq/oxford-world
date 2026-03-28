export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor: string;
  price: number; // NTD, 0 = free
  isFreePreview: boolean;
  thumbnailUrl: string;
  category: string;
  muxPlaybackId?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  tier: "free" | "pro";
  stripeCustomerId?: string;
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
