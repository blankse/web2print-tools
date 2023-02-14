/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Commercial License (PCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 *  @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 *  @license    http://www.pimcore.org/license     GPLv3 and PCL
 */

pimcore.registerNS('pimcore.plugin.web2print');

pimcore.plugin.web2print = Class.create({
    getClassName: function () {
        return 'pimcore.plugin.web2print';
    },

    initialize: function () {
        // if the new event exists, we use this
        if (pimcore.events.preMenuBuild) {
            document.addEventListener(pimcore.events.preMenuBuild, this.preMenuBuild.bind(this));
        } else {
            document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
        }
    },

    preMenuBuild: function (e) {
        const perspectiveCfg = pimcore.globalmanager.get("perspective");

        if(!perspectiveCfg.inToolbar("settings.favorite_outputdefinitions")){
            return;
        }

        const user = pimcore.globalmanager.get("user");
        if (user.admin || user.isAllowed("web2print_web2print_favourite_output_channels")) {
            let menu = e.detail.menu.settings;

            menu.items.push({
                text: t("web2print_favorite_outputdefinitions"),
                iconCls: "bundle_outputdataconfig_nav_icon",
                handler: this.openFavouriteOutputChannel
            });
        }
    },

    pimcoreReady: function () {
        const perspectiveCfg = pimcore.globalmanager.get("perspective");

        if(!perspectiveCfg.inToolbar("settings.favorite_outputdefinitions")){
            return;
        }

        const user = pimcore.globalmanager.get("user");
        if (user.admin || user.isAllowed("web2print_web2print_favourite_output_channels")) {
            let menu = pimcore.globalmanager.get("layout_toolbar").settingsMenu;
            menu.add({
                text: t("web2print_favorite_outputdefinitions"),
                iconCls: "bundle_outputdataconfig_nav_icon",
                handler: this.openFavouriteOutputChannel
            });
        }
    },

    openFavouriteOutputChannel: function () {
        try {
            pimcore.globalmanager.get("web2print.favorite_outputdefinitions").activate();
        }
        catch (e) {
            pimcore.globalmanager.add("web2print.favorite_outputdefinitions", new pimcore.bundle.web2print.favoriteOutputDefinitionsTable());
        }
    }
});

const web2PrintBundle = new pimcore.plugin.web2print();