'use client';

import React from 'react';
import { useLanguage } from '@/lib/language';

interface AutoTranslateProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/**
 * Automatically translates all text content within its children.
 * Just wrap any section and all text will be translated automatically.
 * 
 * @example
 * <AutoTranslate>
 *   <h1>Welcome to our restaurant</h1>
 *   <p>{product.description}</p>
 * </AutoTranslate>
 */
export function AutoTranslate({ children, className, as: Component = 'div' }: AutoTranslateProps) {
  const { t } = useLanguage();

  // Recursively translate text nodes in the component tree
  const translateChildren = (node: React.ReactNode): React.ReactNode => {
    // If it's a string, translate it
    if (typeof node === 'string') {
      return t(node);
    }

    // If it's a valid React element, clone it with translated children
    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<any>;
      return React.cloneElement(
        element,
        element.props,
        React.Children.map(element.props.children, translateChildren)
      );
    }

    // If it's an array, map over it
    if (Array.isArray(node)) {
      return node.map((child, index) => (
        <React.Fragment key={index}>{translateChildren(child)}</React.Fragment>
      ));
    }

    // Return as-is for other types (null, undefined, boolean, number)
    return node;
  };

  return React.createElement(Component, { className }, translateChildren(children));
}

// Export as Translate for backwards compatibility
export { AutoTranslate as Translate };
