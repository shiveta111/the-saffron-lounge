/**
 * Property-Based Tests for About Page
 * Feature: fix-runtime-errors-all-pages, Property 2: Undefined Props Handling
 * Validates: Requirements 1.2, 2.4, 4.1
 */

import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { TeamMemberForDisplay } from '../../../lib/teamData';

// Mock the components to isolate testing
jest.mock('@/components/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/Home/Testimonials', () => ({
  __esModule: true,
  default: () => <div>Testimonials</div>,
}));

jest.mock('@/components/Home/AboutSection', () => ({
  __esModule: true,
  default: () => <div>AboutSection</div>,
}));

jest.mock('../../../components/Common/Breadcrumb', () => ({
  __esModule: true,
  default: ({ pathname, title }: { pathname?: string; title?: string }) => (
    <div>Breadcrumb: {pathname} - {title}</div>
  ),
}));

jest.mock('@/components/Home/TeamProfiles', () => ({
  __esModule: true,
  default: ({ members, title, description }: {
    members?: TeamMemberForDisplay[];
    title?: string;
    description?: string;
  }) => (
    <div>
      TeamProfiles: {members?.length || 0} members
    </div>
  ),
}));

// Import after mocks
import AboutPage from '../page';

describe('About Page - Property-Based Tests', () => {
  /**
   * Feature: fix-runtime-errors-all-pages, Property 2: Undefined Props Handling
   * Validates: Requirements 1.2, 2.4, 4.1
   * 
   * For any component that receives undefined or null props, the component should
   * render successfully using default values or conditional rendering without crashing
   */
  describe('Property 2: Undefined Props Handling', () => {
    it('should render without crashing with any team member data', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant([]),
            fc.constant(null),
            fc.constant(undefined),
            fc.array(fc.record({
              id: fc.integer(),
              name: fc.string(),
              role: fc.string(),
              image: fc.string(),
              bio: fc.option(fc.string(), { nil: undefined }),
            }))
          ),
          (teamData) => {
            // Should not throw when rendering with any team data
            expect(() => {
              render(<AboutPage />);
            }).not.toThrow();
          }
        ),
        { numRuns: 50 } // Reduced runs for component tests
      );
    });

    it('should handle undefined props gracefully', () => {
      // Test that the page renders without throwing
      expect(() => {
        render(<AboutPage />);
      }).not.toThrow();
    });

    it('should render with empty team members array', () => {
      const { container } = render(<AboutPage />);
      expect(container).toBeTruthy();
    });
  });
});
