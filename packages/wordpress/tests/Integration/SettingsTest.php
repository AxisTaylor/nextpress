<?php
/**
 * Tests for the NextPress Settings class.
 *
 * @package NextPress\Tests\Integration
 */

namespace Tests\Integration;

use Tests\Support\NextPressTestCase;
use NextPress\Settings;
use NextPress\Settings_Registry;

/**
 * Class SettingsTest
 *
 * Tests the Settings and Settings_Registry classes.
 */
class SettingsTest extends NextPressTestCase
{
    /**
     * Test that Settings class can be instantiated.
     */
    public function testSettingsCanBeInstantiated(): void
    {
        $settings = new Settings();

        $this->assertInstanceOf(Settings::class, $settings);
    }

    /**
     * Test that Settings registers settings API.
     */
    public function testSettingsRegistersSettingsApi(): void
    {
        $settings = new Settings();
        $settings->init();

        $this->assertInstanceOf(Settings_Registry::class, $settings->settings_api);
    }

    /**
     * Test that CORS settings section is registered.
     */
    public function testCorsSettingsSectionIsRegistered(): void
    {
        $settings = new Settings();
        $settings->init();

        // Trigger register_settings which runs on 'init'
        $settings->register_settings();

        // Check that the section was registered
        $sections = $settings->settings_api->get_settings_sections();
        $sectionIds = array_keys($sections);

        $this->assertContains('nextpress_cors_settings', $sectionIds);
    }

    /**
     * Test that headless settings section is registered.
     */
    public function testHeadlessSettingsSectionIsRegistered(): void
    {
        $settings = new Settings();
        $settings->init();

        // Trigger register_settings
        $settings->register_settings();

        $sections = $settings->settings_api->get_settings_sections();
        $sectionIds = array_keys($sections);

        $this->assertContains('nextpress_headless_settings', $sectionIds);
    }

    /**
     * Test that nextpress_get_setting function works.
     */
    public function testNextpressGetSettingFunction(): void
    {
        // Test default value when setting doesn't exist
        $value = nextpress_get_setting('nonexistent_setting', 'default_value');

        $this->assertEquals('default_value', $value);
    }

    /**
     * Test that enable_cors setting has correct default.
     */
    public function testEnableCorsSettingDefault(): void
    {
        $value = nextpress_get_setting('enable_cors', 'off');

        $this->assertEquals('off', $value);
    }

    /**
     * Test that enable_custom_api_fetch setting has correct default.
     */
    public function testEnableCustomApiFetchSettingDefault(): void
    {
        // Default is 'on' per the settings registration
        $value = nextpress_get_setting('enable_custom_api_fetch', 'on');

        $this->assertEquals('on', $value);
    }
}
