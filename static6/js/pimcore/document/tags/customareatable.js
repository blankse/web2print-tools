/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Enterprise License (PEL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @category   Pimcore
 * @package    EcommerceFramework
 * @copyright  Copyright (c) 2009-2016 pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PEL
 */


pimcore.registerNS("pimcore.document.tags.customareatable");
pimcore.document.tags.customareatable = Class.create(pimcore.document.tag, {

    selectedClass: null,
    documentId: null,

    initialize: function(id, name, options, data, inherited) {

        this.id = id;
        this.name = name;
 
        if (!options) {
            options = {};
        }

        this.options = options;
        this.data = data.elements;
        this.selectedClass = options.class;

        this.documentId = data.documentId;

        this.setupWrapper();

        this.store = new Ext.data.ArrayStore({
            data: this.data,
            fields: [
                "id",
                "path",
                "type",
                "subtype",
                "config"
                ]
        });


        var elementConfig = {
            disabled: !this.selectedClass,
            store: this.store,
            selModel: Ext.create('Ext.selection.RowModel', {}),
            viewConfig: {
                plugins: {
                    ptype: 'gridviewdragdrop',
                    dragroup: 'element'
                },
                listeners: {
                    drop: function(node, data, dropRec, dropPosition) {
                        var dropOn = dropRec ? ' ' + dropPosition + ' ' + dropRec.get('name') : ' on empty view';
                        //Ext.example.msg('Drag from left to right', 'Dropped ' + data.records[0].get('name') + dropOn);
                    }
                }
            },
            border: false,
            cls: "outputchanneltable",
            frame: true,
            columns: {
                defaults: {
                    sortable: false
                },
                items: [
                    {header: 'ID', dataIndex: 'id', width: 50},
                    {header: t("path"), dataIndex: 'path', flex: 250},
                    {header: t("type"), dataIndex: 'type', width: 100},
                    {header: t("subtype"), dataIndex: 'subtype', width: 100},
                    {
                        xtype: 'actioncolumn',
                        width: 40,
                        items: [{
                            tooltip: t('open'),
                            icon: "/pimcore/static6/img/flat-color-icons/cursor.svg",
                            handler: function (grid, rowIndex) {
                                var data = grid.getStore().getAt(rowIndex);

                                if(data.data.type == "meta") {
                                    this.openMetaInfoDialog(data);
                                } else {
                                    var subtype = data.data.subtype;
                                    if (data.data.type == "object" && data.data.subtype != "folder") {
                                        subtype = "object";
                                    }
                                    pimcore.helpers.openElement(data.data.id, data.data.type, subtype);
                                }
                            }.bind(this)
                        }]
                    },
                    {
                        xtype: 'actioncolumn',
                        width: 40,
                        items: [{
                            tooltip: t('remove'),
                            icon: "/pimcore/static6/img/flat-color-icons/delete.svg",
                            handler: function (grid, rowIndex) {
                                grid.getStore().removeAt(rowIndex);
                            }.bind(this)
                        }]
                    }
                ]
            },
            tbar: {
                items: [
                    {
                        xtype: "tbspacer",
                        width: 20,
                        height: 16,
                        cls: "pimcore_icon_droptarget"
                    },
                    {
                        xtype: "tbtext",
                        text: "<b>" + (this.options.title ? this.options.title : "") + "</b>"
                    },
                    "->",
                    {
                        xtype: "button",
                        iconCls: "pimcore_icon_delete",
                        handler: this.empty.bind(this)
                    },
                    {
                        xtype: "button",
                        iconCls: "pimcore_icon_search",
                        handler: this.openSearchEditor.bind(this)
                    }
                ]
            },

            ddGroup: 'element'
        };

        // height specifics
        if(typeof this.options.height != "undefined") {
            elementConfig.height = this.options.height;
        } else {
            elementConfig.autoHeight = true;
        }

        // width specifics
        if(typeof this.options.width != "undefined") {
            elementConfig.width = this.options.width;
        }


        this.gridElement = Ext.create("Ext.grid.Panel", elementConfig);

        this.gridElement.on("rowcontextmenu", this.onRowContextmenu);

        this.gridElement.on("afterrender", function (el) {
            // register at global DnD manager
            dndManager.addDropTarget(this.gridElement.getEl(),
                this.onNodeOver.bind(this),
                this.onNodeDrop.bind(this)
            );

        }.bind(this));

        var items = this.getFormItems();
        this.element = new Ext.form.FormPanel({
            bodyStyle: "padding: 10px;",
            border: false,
            items: items
        });


        this.element.render(id);
    },

    getFormItems : function(){
        var items = [];
        items.push(this.gridElement);
        return items;
    },


    onNodeOver: function(target, dd, e, data) {
        var record = data.records[0];
        var data = record.data;

        if(data.elementType == "object" && data.className == this.selectedClass) {
            return Ext.dd.DropZone.prototype.dropAllowed;
        } else {
            return Ext.dd.DropZone.prototype.dropNotAllowed;
        }
    },

    onNodeDrop: function (target, dd, e, data) {
        var record = data.records[0];
        var data = record.data;

        //data = this.getCustomPimcoreDropData(data);
        if(data.elementType == "object" && data.className == this.selectedClass) {
            var initData = {
                id: data.id,
                path: data.path,
                type: data.elementType
            };

            if (initData.type == "object") {
                if (data.className) {
                    initData.subtype = data.className;
                }
                else {
                    initData.subtype = "folder";
                }
            }

            if (initData.type == "document" || initData.type == "asset") {
                initData.subtype = data.type;
            }

            // check for existing element
            if (!this.elementAlreadyExists(initData.id, initData.type)) {
                this.store.add(initData);
                return true;
            }
        }

        return false;

    },

    onRowContextmenu: function (grid, record, tr, rowIndex, e, eOpts) {

        var menu = new Ext.menu.Menu();
        var data = grid.getStore().getAt(rowIndex);

        menu.add(new Ext.menu.Item({
            text: t('remove'),
            iconCls: "pimcore_icon_delete",
            handler: this.reference.removeElement.bind(this, rowIndex)
        }));

        menu.add(new Ext.menu.Item({
            text: t('open'),
            iconCls: "pimcore_icon_open",
            handler: function (data, item) {

                item.parentMenu.destroy();

                var subtype = data.data.subtype;
                if (data.data.type == "object" && data.data.subtype != "folder") {
                    subtype = "object";
                }
                pimcore.helpers.openElement(data.data.id, data.data.type, subtype);
            }.bind(this, data)
        }));

        menu.add(new Ext.menu.Item({
            text: t('search'),
            iconCls: "pimcore_icon_search",
            handler: function (item) {
                item.parentMenu.destroy();
                this.openSearchEditor();
            }.bind(this.reference)
        }));

        e.stopEvent();
        menu.showAt(e.pageX, e.pageY);
    },

    openSearchEditor: function () {

        var restrictions = {
            type: ["object"],
            subtype: {
                object: ["object", "folder", "variant"]
            },
            forceSubtypeFilter: true,
            specific: {
                classes: [this.selectedClass]
            }
        };
        pimcore.helpers.itemselector(true, this.addDataFromSelector.bind(this), restrictions);

    },

    elementAlreadyExists: function (id, type) {

        // check for existing element
        var result = this.store.queryBy(function (id, type, record, rid) {
            if (record.data.id == id && record.data.type == type) {
                return true;
            }
            return false;
        }.bind(this, id, type));

        if (result.length < 1) {
            return false;
        }
        return true;
    },

    addDataFromSelector: function (items) {
        if (items.length > 0) {
            for (var i = 0; i < items.length; i++) {
                if (!this.elementAlreadyExists(items[i].id, items[i].type)) {

                    var subtype = items[i].subtype;
                    if (items[i].type == "object") {
                        if (items[i].subtype == "object") {
                            if (items[i].classname) {
                                subtype = items[i].classname;
                            }
                        }
                    }

                    this.store.add({
                        id: items[i].id,
                        path: items[i].fullpath,
                        type: items[i].type,
                        subtype: subtype
                    });
                }
            }
        }
    },

    empty: function () {
        this.store.removeAll();
    },

    removeElement: function (index, item) {
        this.getStore().removeAt(index);
        item.parentMenu.destroy();
    },

    getValue: function () {
        var tmData = [];

        var data = this.store.queryBy(function(record, id) {
            return true;
        });


        for (var i = 0; i < data.items.length; i++) {
            tmData.push(data.items[i].data);
        }

        return {
            elements: tmData
        };
    },

    getType: function () {
        return "customareatable";
    }
});
