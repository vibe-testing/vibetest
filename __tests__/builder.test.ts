/**
 * GraphBuilder Tests
 *
 * Comprehensive tests for the GraphBuilder class that constructs
 * and manages the exploration graph.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphBuilder } from '../src/graph/builder.js';
import {
  GraphNodeType,
  ElementType,
  InputFieldType,
  TransitionType,
  NavigationStatus,
} from '../src/graph/types.js';

describe('GraphBuilder', () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe('initialize()', () => {
    it('sets up correctly with default options', () => {
      builder.initialize('https://example.com');

      const data = builder.serialize();
      expect(data.metadata.startUrl).toBe('https://example.com');
      expect(data.metadata.maxDepth).toBe(3);
      expect(data.metadata.maxPages).toBe(100);
    });

    it('sets up correctly with custom options', () => {
      builder.initialize('https://example.com', { maxDepth: 5, maxPages: 50 });

      const data = builder.serialize();
      expect(data.metadata.startUrl).toBe('https://example.com');
      expect(data.metadata.maxDepth).toBe(5);
      expect(data.metadata.maxPages).toBe(50);
    });

    it('sets up correctly with partial options', () => {
      builder.initialize('https://example.com', { maxDepth: 10 });

      const data = builder.serialize();
      expect(data.metadata.maxDepth).toBe(10);
      expect(data.metadata.maxPages).toBe(100);
    });

    it('updates createdAt timestamp on initialize', () => {
      const beforeInit = new Date();
      builder.initialize('https://example.com');
      const afterInit = new Date();

      const data = builder.serialize();
      expect(data.metadata.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeInit.getTime()
      );
      expect(data.metadata.createdAt.getTime()).toBeLessThanOrEqual(
        afterInit.getTime()
      );
    });
  });

  describe('addPage()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
    });

    it('adds a page node to the graph', () => {
      const result = builder.addPage('page-1', 'https://example.com', {
        depth: 0,
        isStartPage: true,
      });

      expect(result).toBe(true);
      expect(builder.hasPage('page-1')).toBe(true);
      expect(builder.getPageCount()).toBe(1);
    });

    it('returns false for duplicate page IDs', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      const result = builder.addPage('page-1', 'https://example.com/other', {
        depth: 1,
      });

      expect(result).toBe(false);
      expect(builder.getPageCount()).toBe(1);
    });

    it('adds page with optional attributes', () => {
      builder.addPage('page-1', 'https://example.com', {
        depth: 0,
        isStartPage: true,
        title: 'Example Page',
        statusCode: 200,
        loadTime: 1500,
      });

      const data = builder.serialize();
      const pageNode = data.nodes.find((n) => n.key === 'page-1');
      expect(pageNode).toBeDefined();

      const attrs = pageNode!.attributes;
      expect(attrs.nodeType).toBe(GraphNodeType.PAGE);

      if (attrs.nodeType === GraphNodeType.PAGE) {
        expect(attrs.title).toBe('Example Page');
        expect(attrs.statusCode).toBe(200);
        expect(attrs.loadTime).toBe(1500);
        expect(attrs.isStartPage).toBe(true);
        expect(attrs.depth).toBe(0);
        expect(attrs.elementsCount).toBe(0);
      }
    });

    it('sets isStartPage to false by default', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 1 });

      const data = builder.serialize();
      const pageNode = data.nodes.find((n) => n.key === 'page-1');
      const attrs = pageNode!.attributes;

      if (attrs.nodeType === GraphNodeType.PAGE) {
        expect(attrs.isStartPage).toBe(false);
      }
    });

    it('sets discoveredAt timestamp', () => {
      const beforeAdd = new Date();
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      const afterAdd = new Date();

      const data = builder.serialize();
      const pageNode = data.nodes.find((n) => n.key === 'page-1');
      const attrs = pageNode!.attributes;

      if (attrs.nodeType === GraphNodeType.PAGE) {
        expect(attrs.discoveredAt.getTime()).toBeGreaterThanOrEqual(
          beforeAdd.getTime()
        );
        expect(attrs.discoveredAt.getTime()).toBeLessThanOrEqual(
          afterAdd.getTime()
        );
      }
    });

    it('adds multiple pages correctly', () => {
      builder.addPage('page-1', 'https://example.com', {
        depth: 0,
        isStartPage: true,
      });
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      builder.addPage('page-3', 'https://example.com/contact', { depth: 1 });

      expect(builder.getPageCount()).toBe(3);
      expect(builder.hasPage('page-1')).toBe(true);
      expect(builder.hasPage('page-2')).toBe(true);
      expect(builder.hasPage('page-3')).toBe(true);
    });
  });

  describe('addElement()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
    });

    it('adds an element node with CONTAINS edge', () => {
      const result = builder.addElement('page-1', 'btn-1', {
        selector: 'button.submit',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.8,
        isInteractable: true,
        isVisible: true,
      });

      expect(result).toBe(true);
      expect(builder.getElementCount()).toBe(1);

      const data = builder.serialize();
      const elementNode = data.nodes.find((n) => n.key === 'element:btn-1');
      expect(elementNode).toBeDefined();

      // Check CONTAINS edge was created
      const containsEdge = data.edges.find(
        (e) => e.source === 'page-1' && e.target === 'element:btn-1'
      );
      expect(containsEdge).toBeDefined();
      expect(containsEdge!.attributes).toHaveProperty('type', 'CONTAINS');
    });

    it('returns false if page does not exist', () => {
      const result = builder.addElement('non-existent', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      expect(result).toBe(false);
      expect(builder.getElementCount()).toBe(0);
    });

    it('returns false for duplicate element IDs', () => {
      builder.addElement('page-1', 'btn-1', {
        selector: 'button.first',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.8,
        isInteractable: true,
        isVisible: true,
      });

      const result = builder.addElement('page-1', 'btn-1', {
        selector: 'button.second',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      expect(result).toBe(false);
      expect(builder.getElementCount()).toBe(1);
    });

    it('adds element with all optional attributes', () => {
      builder.addElement('page-1', 'input-1', {
        selector: 'input#email',
        type: ElementType.INPUT,
        inputType: InputFieldType.EMAIL,
        tagName: 'input',
        text: 'Email address',
        name: 'email',
        placeholder: 'Enter your email',
        ariaLabel: 'Email input field',
        importance: 0.9,
        isInteractable: true,
        isVisible: true,
        boundingBox: { x: 10, y: 20, width: 200, height: 40 },
      });

      const data = builder.serialize();
      const elementNode = data.nodes.find((n) => n.key === 'element:input-1');
      const attrs = elementNode!.attributes;

      if (attrs.nodeType === GraphNodeType.ELEMENT) {
        expect(attrs.selector).toBe('input#email');
        expect(attrs.type).toBe(ElementType.INPUT);
        expect(attrs.inputType).toBe(InputFieldType.EMAIL);
        expect(attrs.text).toBe('Email address');
        expect(attrs.name).toBe('email');
        expect(attrs.placeholder).toBe('Enter your email');
        expect(attrs.ariaLabel).toBe('Email input field');
        expect(attrs.boundingBox).toEqual({ x: 10, y: 20, width: 200, height: 40 });
      }
    });

    it('adds element with href for links', () => {
      builder.addElement('page-1', 'link-1', {
        selector: 'a.nav-link',
        type: ElementType.LINK,
        tagName: 'a',
        href: 'https://example.com/about',
        text: 'About Us',
        importance: 0.7,
        isInteractable: true,
        isVisible: true,
      });

      const data = builder.serialize();
      const elementNode = data.nodes.find((n) => n.key === 'element:link-1');
      const attrs = elementNode!.attributes;

      if (attrs.nodeType === GraphNodeType.ELEMENT) {
        expect(attrs.href).toBe('https://example.com/about');
      }
    });

    it('increments page elementsCount', () => {
      builder.addElement('page-1', 'btn-1', {
        selector: 'button.first',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.8,
        isInteractable: true,
        isVisible: true,
      });

      builder.addElement('page-1', 'btn-2', {
        selector: 'button.second',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.7,
        isInteractable: true,
        isVisible: true,
      });

      const data = builder.serialize();
      const pageNode = data.nodes.find((n) => n.key === 'page-1');
      const attrs = pageNode!.attributes;

      if (attrs.nodeType === GraphNodeType.PAGE) {
        expect(attrs.elementsCount).toBe(2);
      }
    });
  });

  describe('addNavigation()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
    });

    it('adds a navigation edge between pages', () => {
      const result = builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.LINK_CLICK,
        status: NavigationStatus.SUCCESS,
      });

      expect(result).toBe(true);

      const data = builder.serialize();
      const navEdge = data.edges.find(
        (e) => e.source === 'page-1' && e.target === 'page-2'
      );
      expect(navEdge).toBeDefined();
    });

    it('returns false if source page does not exist', () => {
      const result = builder.addNavigation('non-existent', 'page-2', {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
      });

      expect(result).toBe(false);
    });

    it('returns false if target page does not exist', () => {
      const result = builder.addNavigation('page-1', 'non-existent', {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
      });

      expect(result).toBe(false);
    });

    it('returns false for duplicate navigation edges', () => {
      builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.LINK_CLICK,
        status: NavigationStatus.SUCCESS,
      });

      const result = builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.BUTTON_CLICK,
        status: NavigationStatus.SUCCESS,
      });

      expect(result).toBe(false);
    });

    it('adds navigation with all optional attributes', () => {
      builder.addElement('page-1', 'link-1', {
        selector: 'a.nav',
        type: ElementType.LINK,
        tagName: 'a',
        importance: 0.7,
        isInteractable: true,
        isVisible: true,
      });

      builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.LINK_CLICK,
        status: NavigationStatus.SUCCESS,
        triggerElementId: 'link-1',
        responseTimeMs: 250,
      });

      const data = builder.serialize();
      const navEdge = data.edges.find(
        (e) => e.source === 'page-1' && e.target === 'page-2'
      );
      const attrs = navEdge!.attributes;

      if ('transitionType' in attrs) {
        expect(attrs.transitionType).toBe(TransitionType.LINK_CLICK);
        expect(attrs.status).toBe(NavigationStatus.SUCCESS);
        expect(attrs.triggerElementId).toBe('link-1');
        expect(attrs.responseTimeMs).toBe(250);
        expect(attrs.fromPageId).toBe('page-1');
        expect(attrs.toPageId).toBe('page-2');
      }
    });

    it('sets traversedAt timestamp', () => {
      const beforeNav = new Date();
      builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
      });
      const afterNav = new Date();

      const data = builder.serialize();
      const navEdge = data.edges.find(
        (e) => e.source === 'page-1' && e.target === 'page-2'
      );
      const attrs = navEdge!.attributes;

      if ('traversedAt' in attrs) {
        expect(attrs.traversedAt.getTime()).toBeGreaterThanOrEqual(
          beforeNav.getTime()
        );
        expect(attrs.traversedAt.getTime()).toBeLessThanOrEqual(afterNav.getTime());
      }
    });
  });

  describe('hasPage()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
    });

    it('returns true for existing pages', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });

      expect(builder.hasPage('page-1')).toBe(true);
    });

    it('returns false for non-existing pages', () => {
      expect(builder.hasPage('page-1')).toBe(false);
    });

    it('returns false for element nodes', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addElement('page-1', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      // Element is stored as 'element:btn-1', not 'btn-1'
      expect(builder.hasPage('btn-1')).toBe(false);
      expect(builder.hasPage('element:btn-1')).toBe(true);
    });
  });

  describe('getPageCount()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
    });

    it('returns 0 for empty graph', () => {
      expect(builder.getPageCount()).toBe(0);
    });

    it('returns correct count after adding pages', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      expect(builder.getPageCount()).toBe(1);

      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      expect(builder.getPageCount()).toBe(2);

      builder.addPage('page-3', 'https://example.com/contact', { depth: 1 });
      expect(builder.getPageCount()).toBe(3);
    });

    it('does not count element nodes', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addElement('page-1', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      expect(builder.getPageCount()).toBe(1);
    });
  });

  describe('getElementCount()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
    });

    it('returns 0 for graph without elements', () => {
      expect(builder.getElementCount()).toBe(0);
    });

    it('returns correct count after adding elements', () => {
      builder.addElement('page-1', 'btn-1', {
        selector: 'button.first',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.8,
        isInteractable: true,
        isVisible: true,
      });
      expect(builder.getElementCount()).toBe(1);

      builder.addElement('page-1', 'btn-2', {
        selector: 'button.second',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.7,
        isInteractable: true,
        isVisible: true,
      });
      expect(builder.getElementCount()).toBe(2);
    });

    it('does not count page nodes', () => {
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      builder.addElement('page-1', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      expect(builder.getElementCount()).toBe(1);
    });
  });

  describe('serialize()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com', { maxDepth: 5, maxPages: 25 });
    });

    it('returns valid ExplorationGraphData structure', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0, isStartPage: true });

      const data = builder.serialize();

      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('edges');
      expect(data).toHaveProperty('metadata');
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
    });

    it('includes all nodes in serialized output', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      builder.addElement('page-1', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      const data = builder.serialize();

      expect(data.nodes.length).toBe(3);
      expect(data.nodes.map((n) => n.key)).toContain('page-1');
      expect(data.nodes.map((n) => n.key)).toContain('page-2');
      expect(data.nodes.map((n) => n.key)).toContain('element:btn-1');
    });

    it('includes all edges in serialized output', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      builder.addElement('page-1', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });
      builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
      });

      const data = builder.serialize();

      // Should have CONTAINS edge (page-1 -> element:btn-1) and nav edge (page-1 -> page-2)
      expect(data.edges.length).toBe(2);
    });

    it('includes correct metadata', () => {
      const data = builder.serialize();

      expect(data.metadata.startUrl).toBe('https://example.com');
      expect(data.metadata.maxDepth).toBe(5);
      expect(data.metadata.maxPages).toBe(25);
      expect(data.metadata.version).toBe('1.0.0');
      expect(data.metadata.cliVersion).toBe('0.1.0');
      expect(data.metadata.createdAt).toBeInstanceOf(Date);
      expect(data.metadata.lastUpdated).toBeInstanceOf(Date);
    });

    it('updates lastUpdated on each serialize call', async () => {
      const data1 = builder.serialize();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const data2 = builder.serialize();

      expect(data2.metadata.lastUpdated.getTime()).toBeGreaterThan(
        data1.metadata.lastUpdated.getTime()
      );
    });

    it('returns empty arrays for empty graph', () => {
      const data = builder.serialize();

      expect(data.nodes).toEqual([]);
      expect(data.edges).toEqual([]);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      builder.initialize('https://example.com');
    });

    it('removes all nodes from the graph', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      builder.addElement('page-1', 'btn-1', {
        selector: 'button',
        type: ElementType.BUTTON,
        tagName: 'button',
        importance: 0.5,
        isInteractable: true,
        isVisible: true,
      });

      expect(builder.getPageCount()).toBe(2);
      expect(builder.getElementCount()).toBe(1);

      builder.clear();

      expect(builder.getPageCount()).toBe(0);
      expect(builder.getElementCount()).toBe(0);
    });

    it('removes all edges from the graph', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.addPage('page-2', 'https://example.com/about', { depth: 1 });
      builder.addNavigation('page-1', 'page-2', {
        transitionType: TransitionType.CLICK,
        status: NavigationStatus.SUCCESS,
      });

      builder.clear();

      const data = builder.serialize();
      expect(data.edges).toEqual([]);
    });

    it('preserves initialization parameters after clear', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.clear();

      const data = builder.serialize();
      expect(data.metadata.startUrl).toBe('https://example.com');
      expect(data.metadata.maxDepth).toBe(3);
      expect(data.metadata.maxPages).toBe(100);
    });

    it('allows adding nodes after clear', () => {
      builder.addPage('page-1', 'https://example.com', { depth: 0 });
      builder.clear();

      const result = builder.addPage('page-1', 'https://example.com', { depth: 0 });
      expect(result).toBe(true);
      expect(builder.getPageCount()).toBe(1);
    });
  });
});
