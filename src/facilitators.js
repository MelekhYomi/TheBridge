// The four facilitators, one per course (matched by course slug).
//
// To fill in a profile:
//   - photo: put a square image (at least 600×600, JPG or WebP) in public/facilitators/
//     and set photo to its path, e.g. '/facilitators/jane-doe.jpg'. Leave it '' to show initials.
//   - socials: paste full https:// links. Leave any you don't want as ''; empty ones are hidden.
//
// These live in code rather than the admin because the hosted database is reset
// on every Vercel cold start, so edits and uploads made there would not stick.
export const FACILITATORS = [
  {
    course: 'product-thinking-automation',
    name: 'Facilitator name',
    role: 'Programme coordinator',
    headline: 'Product thinking and automation',
    photo: '',
    bio: 'A short two or three sentence bio: current work, years of experience and what you love teaching beginners.',
    qualifications: [
      'Degree, institution',
      'Professional certification',
      'Notable role or achievement',
    ],
    socials: { linkedin: '', x: '', github: '', instagram: '', website: '' },
  },
  {
    course: 'software-development',
    name: 'Facilitator name',
    role: 'Developer',
    headline: 'Software development',
    photo: '',
    bio: 'A short two or three sentence bio: current work, years of experience and what you love teaching beginners.',
    qualifications: [
      'Degree, institution',
      'Professional certification',
      'Notable role or achievement',
    ],
    socials: { linkedin: '', x: '', github: '', instagram: '', website: '' },
  },
  {
    course: 'cybersecurity',
    name: 'Facilitator name',
    role: 'Cybersecurity expert',
    headline: 'Cybersecurity',
    photo: '',
    bio: 'A short two or three sentence bio: current work, years of experience and what you love teaching beginners.',
    qualifications: [
      'Degree, institution',
      'Professional certification',
      'Notable role or achievement',
    ],
    socials: { linkedin: '', x: '', github: '', instagram: '', website: '' },
  },
  {
    course: 'blockchain-security',
    name: 'Facilitator name',
    role: 'Blockchain security expert',
    headline: 'Blockchain security',
    photo: '',
    bio: 'A short two or three sentence bio: current work, years of experience and what you love teaching beginners.',
    qualifications: [
      'Degree, institution',
      'Professional certification',
      'Notable role or achievement',
    ],
    socials: { linkedin: '', x: '', github: '', instagram: '', website: '' },
  },
];

export const facilitatorFor = (slug) => FACILITATORS.find((f) => f.course === slug);
