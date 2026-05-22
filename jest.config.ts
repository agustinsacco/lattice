import { getJestProjectsAsync } from '@nx/jest';

export default async () => ({
  projects: await getJestProjectsAsync(),
  testPathIgnorePatterns: ['/node_modules/', '/.vendor/', '/sandbox/'],
});
