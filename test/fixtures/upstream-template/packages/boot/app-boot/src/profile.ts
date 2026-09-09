export const PROFILE_TEMPLATES: Record<string, ProfileTemplate> = {
  'beta-minimal': { bundles: ['bundle-b', 'bundle-a'], patchReload: 'startup' },
  alpha: { bundles: ['bundle-c'], patchReload: 'live' },
}
