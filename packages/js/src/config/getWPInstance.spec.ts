// Mock data
const mockInstance = {
  wpDomain: 'example.com',
  wpProtocol: 'https',
  wpHomeUrl: 'https://example.com',
  wpSiteUrl: 'https://example.com',
};

const mockInstances = {
  default: mockInstance,
  blog: {
    wpDomain: 'blog.example.com',
    wpProtocol: 'https',
    wpHomeUrl: 'https://blog.example.com',
    wpSiteUrl: 'https://blog.example.com',
  },
};

describe('getWPInstance', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env;

    // Clear module cache to reset the internal cache
    jest.resetModules();

    // Clear environment variable
    delete process.env.NEXTPRESS_WP_INSTANCES;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('with environment variable', () => {
    it('should load instance from env var', () => {
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(mockInstances);

      // Re-import to get fresh module with new env
      const { getWPInstance } = require('./getWPInstance');

      const instance = getWPInstance('default');
      expect(instance).toEqual(mockInstance);
    });

    it('should throw error if env var has invalid JSON', () => {
      process.env.NEXTPRESS_WP_INSTANCES = 'invalid json';

      const { getWPInstance } = require('./getWPInstance');

      expect(() => getWPInstance('default')).toThrow(
        'Failed to parse NEXTPRESS_WP_INSTANCES environment variable'
      );
    });

    it('should throw error if instance slug not found', () => {
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(mockInstances);

      const { getWPInstance } = require('./getWPInstance');

      expect(() => getWPInstance('nonexistent')).toThrow(
        'WordPress instance "nonexistent" not found. Available instances: default, blog'
      );
    });

    it('should cache instances after first load', () => {
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(mockInstances);

      const { getWPInstance } = require('./getWPInstance');

      // First call loads from env
      const instance1 = getWPInstance('default');

      // Modify env (should not affect cached result)
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify({
        default: { ...mockInstance, wpDomain: 'changed.com' },
      });

      // Second call should return cached value
      const instance2 = getWPInstance('default');

      expect(instance1).toEqual(instance2);
      expect(instance2.wpDomain).toBe('example.com'); // Not 'changed.com'
    });
  });

  describe('without configuration', () => {
    it('should throw error when no config file or env var exists', () => {
      const { getWPInstance } = require('./getWPInstance');

      expect(() => getWPInstance('default')).toThrow(
        'NEXTPRESS_WP_INSTANCES environment variable not found. Make sure withWCR is properly configured in next.config.js'
      );
    });
  });

  describe('getAllWPInstances', () => {
    it('should return all instances', () => {
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(mockInstances);

      const { getAllWPInstances } = require('./getWPInstance');

      const instances = getAllWPInstances();
      expect(instances).toEqual(mockInstances);
    });

    it('should return empty object properties correctly', () => {
      const singleInstance = { default: mockInstance };
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(singleInstance);

      const { getAllWPInstances } = require('./getWPInstance');

      const instances = getAllWPInstances();
      expect(Object.keys(instances)).toHaveLength(1);
      expect(instances.default).toEqual(mockInstance);
    });
  });

  describe('getInstanceSlugs', () => {
    it('should return all instance slugs', () => {
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(mockInstances);

      const { getInstanceSlugs } = require('./getWPInstance');

      const slugs = getInstanceSlugs();
      expect(slugs).toEqual(['default', 'blog']);
    });

    it('should return empty array when no instances', () => {
      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify({});

      const { getInstanceSlugs } = require('./getWPInstance');

      const slugs = getInstanceSlugs();
      expect(slugs).toEqual([]);
    });
  });

  describe('WPInstance type validation', () => {
    it('should work with valid instance structure', () => {
      const validInstance = {
        default: {
          wpDomain: 'test.com',
          wpProtocol: 'http',
          wpHomeUrl: 'http://test.com',
          wpSiteUrl: 'http://test.com/wp',
        },
      };

      process.env.NEXTPRESS_WP_INSTANCES = JSON.stringify(validInstance);

      const { getWPInstance } = require('./getWPInstance');

      const instance = getWPInstance('default');
      expect(instance).toHaveProperty('wpDomain');
      expect(instance).toHaveProperty('wpProtocol');
      expect(instance).toHaveProperty('wpHomeUrl');
      expect(instance).toHaveProperty('wpSiteUrl');
    });
  });
});
