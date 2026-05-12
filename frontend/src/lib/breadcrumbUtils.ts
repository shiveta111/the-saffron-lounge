export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function generateBreadcrumbs(pathname: string, dynamicTitle?: string): BreadcrumbItem[] {
  // Safety check for undefined or null pathname
  if (!pathname || typeof pathname !== 'string') {
    return [];
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  if (segments.length === 0) return [];

  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    let label = segment;

    // Customize labels for known routes
    switch (segment) {
      case 'about':
        label = 'About';
        break;
      case 'blog':
        label = 'Blog';
        break;
      case 'Place Order':
        label = ' Place Order';
        break;
      case 'menu':
        label = 'Menu';
        break;
      case 'cart':
        label = 'Cart';
        break;
      case 'checkout':
        label = 'Checkout';
        break;
      case 'contact':
        label = 'Contact';
        break;
      case 'faq':
        label = 'FAQ';
        break;
      case 'gallery':
        label = 'Gallery';
        break;
      case 'chef':
        label = 'Chef';
        break;
      case 'team':
        label = 'Team';
        break;
      case 'pages':
        // Skip pages segment, use next
        continue;
      case 'reserve-table':
        label = 'Reserve Table';
        break;
      case 'private-dining':
        label = 'Private Dining';
        break;
      case 'wine-list':
        label = 'Wine List';
        break;
      case 'terms':
        label = 'Terms';
        break;
      case 'privacy-policy':
        label = 'Privacy Policy';
        break;
      case 'testimonials':
        label = 'Testimonials';
        break;
      case 'services':
        label = 'Services';
        break;
      case 'profile':
        label = 'Profile';
        break;
      default:
        // For dynamic segments like [id], use the dynamicTitle if provided
        if (dynamicTitle && i === segments.length - 1) {
          label = dynamicTitle;
        } else {
          // Convert kebab-case to Title Case
          label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        break;
    }

    // Don't add href for the last item (current page)
    const href = i === segments.length - 1 ? undefined : currentPath;

    breadcrumbs.push({ label, href });
  }

  return breadcrumbs;
}
