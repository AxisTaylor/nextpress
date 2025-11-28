<?php

namespace Tests\EndToEnd;

use Tests\Support\EndToEndTester;

class ActivationCest
{
    public function test_it_deactivates_activates_correctly(EndToEndTester $I): void
    {
        $I->loginAsAdmin();
        $I->amOnPluginsPage();

        $I->seePluginActivated('next-press');

        $I->deactivatePlugin('next-press');

        $I->seePluginDeactivated('next-press');

        $I->activatePlugin('next-press');

        $I->seePluginActivated('next-press');
    }
}
