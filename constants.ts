
import { NavLinkItem, JobType } from './types';

export const APP_NAME = "Talent X";

export const NAV_LINKS: NavLinkItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Jobs', path: '/jobs' },
  { name: 'Internships', path: '/internships' },
  { name: 'Services', path: '/services' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'Login/Sign Up', path: '/auth', hideWhenAuth: true },
  { name: 'Profile', path: '/profile', authRequired: true },
];

export const JOB_TYPES_OPTIONS = Object.values(JobType);

export const MOCK_API_KEY = "AIzaSyCc81asI6ghbWn1Va_rs2n39Gs970baNfo"; // Placeholder, should be in .env

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';