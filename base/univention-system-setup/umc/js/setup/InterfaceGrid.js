/*
 * Copyright 2012 Univention GmbH
 *
 * http://www.univention.de/
 *
 * All rights reserved.
 *
 * The source code of this program is made available
 * under the terms of the GNU Affero General Public License version 3
 * (GNU AGPL V3) as published by the Free Software Foundation.
 *
 * Binary versions of this program provided by Univention to you as
 * well as other copyrighted, protected or trademarked materials like
 * Logos, graphics, fonts, specific documentations and configurations,
 * cryptographic keys etc. are subject to a license agreement between
 * you and Univention and not subject to the GNU AGPL V3.
 *
 * In the case you use this program under the terms of the GNU AGPL V3,
 * the program is provided in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License with the Debian GNU/Linux or Univention distribution in file
 * /usr/share/common-licenses/AGPL-3; if not, see
 * <http://www.gnu.org/licenses/>.
 */
/*global define*/

define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/aspect",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"dijit/Dialog",
	"umc/dialog",
	"umc/tools",
	"umc/widgets/Grid",
	"umc/widgets/Form",
	"umc/widgets/_FormWidgetMixin",
	"umc/widgets/ComboBox",
	"umc/widgets/TextBox",
	"umc/modules/setup/InterfaceWizard",
	"umc/modules/setup/types",
	"umc/i18n!umc/modules/setup"
], function(declare, lang, array, aspect, Memory, Observable, Dialog, dialog, tools, Grid, Form, _FormWidgetMixin, ComboBox, TextBox, InterfaceWizard, types, _) {
	return declare("umc.modules.setup.InterfaceGrid", [ Grid, _FormWidgetMixin ], {
		moduleStore: null,

		style: 'width: 100%; height: 200px;',
		query: {},
		sortIndex: null,

		physical_interfaces: [],

		gateway: "",
		nameserver: [],

		constructor: function() {
			this.moduleStore = new Observable(new Memory({idProperty: 'interface'}));

			lang.mixin(this, {
				columns: [{
					name: 'interface',
					label: _('Interface'),
					width: '15%'
				}, {
					name: 'interfaceType',
					label: _('Type'),
					width: '15%',
					formatter: function(value) {
						return types.interfaceTypes[value] || value;
					}
				}, {
					name: 'information',
					label: _('Information'),
					formatter: lang.hitch(this, function(__nothing__, row, scope) {
						var iface = this.getRowValues(row);
						var back = '';

						if (((iface.interfaceType === 'eth' || iface.interfaceType === 'vlan') && iface.type !== 'manual') || (iface.interfaceType === 'bond' || iface.interfaceType === 'br')) {
							// display IP addresses
							var formatIp = function(ips) {
								return array.map(ips, function(i) { return i[0] + '/' + types.convertNetmask(i[1]);}).join(', ');
							};
							back = _('IP addresses') + ': ';
							if (iface.ip4dynamic) {
								back += 'DHCP';
							} else if (iface.ip4.length){
								back += formatIp(iface.ip4);
							}
							if (iface.ip6dynamic) {
								back += ', <br>SLAAC';
							} else if (iface.ip6.length) {
								back += ', <br>' + formatIp(iface.ip6);
							}
						}

						if (iface.interfaceType === 'br' || iface.interfaceType === 'bond') {
							// display s/related/TODO/ interfaces
							back += '<br>' + _('Interfaces') + ': ' + iface[iface.interfaceType === 'br' ? 'bridge_ports' : 'bond-slaves'].join(', ');
						}

						return back;
					}),
					width: '70%'
				}],
				actions: [{
				// TODO: decide if we show a DHCP query action for every row?!
//					name: 'dhcp_query',
//					label: 'DHCP query',
//					callback: lang.hitch(this, function() {
//						// TODO: interface name
//				//		this._dhcpQuery();
//					}),
//					isMultiAction: false,
//					isStandardAction: true,
//					isContextAction: true
//				}, {
					name: 'edit',
					label: _('Edit'),
					iconClass: 'umcIconEdit',
					isMultiAction: false,
					isStandardAction: true,
					isContextAction: true,
					callback: lang.hitch(this, '_editInterface')
				}, {
					name: 'add',
					label: _('Add interface'),
					iconClass: 'umcIconAdd',
					isMultiAction: false,
					isStandardAction: false,
					isContextAction: false,
					callback: lang.hitch(this, '_addInterface')
				}, {
					name: 'delete',
					label: _('Delete'),
					iconClass: 'umcIconDelete',
					isMultiAction: true,
					isStandardAction: true,
					callback: lang.hitch(this, function(ids) {
						dialog.confirm(_('Please confirm the removal of the %d selected interfaces!', ids.length), [{
							label: _('Delete'),
							callback: lang.hitch(this, '_removeInterface', ids)
						}, {
							label: _('Cancel'),
							'default': true
						}]);
					})
				}]
			});
		},

		_getValueAttr: function() { return this.moduleStore.query(); },

		_setValueAttr: function(values) {
			// TODO: delete the whole grid items and add the items from values
			tools.forIn(values, function(id, value) {
				try {
					this.moduleStore.add(lang.mixin({'interface': id}, value));
				} catch(e) {
					console.error('Error while setting interfaces: ', e);
				}
			}, this);
			this._set('value', this.get('value'));
		},

		onChange: function() {
			// event stub
		},

		updateInterface: function(iface, create) {
				// if a DHCP query was done the iface for gateway and nameserver are set
				// so we trigger on change event
				if (iface.gateway) {
					this.set('gateway', iface.gateway);
				}
				if (iface.nameserver && iface.nameserver.length) {
					this.set('nameserver', iface.nameserver);
				}
				delete iface.gateway;
				delete iface.nameserver;

				if (iface.interfaceType === 'eth') {

				} else if (iface.interfaceType === 'vlan') {
					// The interface is build from interface.vlan_id
					var ifacename = iface['interface'];
					iface['interface'] = iface['interface'].split('.', 1) + '.' + String(iface.vlan_id);
					if (!create && ifacename !== iface['interface']) {
						this.moduleStore.remove(ifacename);
					}

				} else if (iface.interfaceType === 'bond' || iface.interfaceType === 'br') {
					iface.start = true;

					// disable the interfaces which are used by this interface
					var key = iface.interfaceType === 'bond' ? 'bond-slaves' : 'bridge_ports';
					this.setDisabledItem(iface[key], true);

					// set original iface
					array.forEach(iface[key], lang.hitch(this, function(ikey) {
						var iiface = this.moduleStore.get(ikey);
						var filtered = {}; tools.forIn(iiface, function(k, v) { if (k.indexOf("_") !== 0) { filtered[k] = v; } });
						iiface.original = lang.clone(filtered);

						// set iface to deactivate the interface iface
						iiface.ip4 = [];
						iiface.ip6 = [];
						iiface.ip4dynamic = false;
						iiface.ip6dynamic = false;
						iiface.type = 'manual';
						iiface.start = false;

						// FIXME: put does not overwrite
						this.moduleStore.put(iiface);
						this.moduleStore.remove(iiface['interface']);
						this.moduleStore.add(iiface);
					}));
				}

				var filtered = {}; tools.forIn(iface, function(k, v) { if (k.indexOf("_") !== 0) { filtered[k] = v; } });
				iface = filtered;
				if (!create) {
					this.moduleStore.put( iface ); // FIXME: why does put not work? we have to manually remove and add it...
					this.moduleStore.remove(iface['interface']);
					this.moduleStore.add( iface );
				} else {
					try {
						this.moduleStore.add( iface );
					} catch(error) {
						console.log(error);
						dialog.alert(_('Interface "%s" already exists', iface['interface']));
					}
				}
			this._set('value', this.get('value'));
			// FIXME: remove; we could replace by .watch(value) but this would catch the initial query on NetworkPage
			this.onChange();
		},

		_addInterface: function() {
			// grid action
			this._modifyInterface({});
		},

		_editInterface: function(name, props) {
			// grid action
			return this._modifyInterface(props[0]);
		},

		_modifyInterface: function(props) {
			// Add or modify an interface
			if (props.interfaceType) {
				// only edit the existing interface
				props.create = false;
				this._showWizard(props);
				return;
			}

			var form; form = new Form({
				widgets: [{
					name: 'interfaceType',
					label: _('Interface type'),
					type: ComboBox,
					onChange: lang.hitch(this, function(interfaceType) {
						// recalculate the possible device number
						if (interfaceType) {
							var name = (interfaceType !== 'vlan' ? interfaceType : 'eth');
							var num = 0;
							while(array.some(array.map(this.get('value'), function(item) { return item['interface']; }), function(iface) { return iface == name + String(num); })) {
								num++;
							}
							form.getWidget('interface').set('interface', name + String(num));
						}
					}),
					dynamicValues: lang.hitch(this, function() {
						// TODO: lookup if interfaces are already in use
						var d = types.interfaceValuesDict();
						if (this.physical_interfaces.length < 2) {
							// we can not use a bonding interface if we don't have at least two physical interfaces
							delete d.bond;
						}
						if (array.every(this.physical_interfaces, lang.hitch(this, function(iface) {
							var ifaces = this.get('value');
							return ifaces.length !== 0 ? array.some(ifaces, function(val) { return iface === val['interface']; }) : false;
						}))) {
							// if all physical interfaces are configured we can not configure another one
							delete d.eth;
						}
						var arr = [];
						// FIXME: add a order: eth, vlan, br, bond
						tools.forIn(d, function(k, v) {
							arr.push(v);
						});
						return arr;
					})
				}, {
					name: 'interface',
					label: _('Interface'),
					type: ComboBox,
					depends: ['interfaceType'],
					dynamicValues: lang.hitch(this, function(deps) {
						var interfaceType = deps.interfaceType;

						if (interfaceType === 'eth') {
							// return all available physical interfaces which are not already in use
							var available = this.get('value');
							return array.filter(this.physical_interfaces, function(_iface) { return array.every(available, function(item) { return item['interface'] !== _iface; }); });
						} else if (interfaceType === 'vlan') {
							// return all physical eth devices
							return this.physical_interfaces;
						} else if(interfaceType === 'br' || interfaceType === 'bond' ) {
							// get the next possible device
							var num = 0;
							while(array.some(array.map(this.get('value'), function(item) { return item['interface']; }), function(_iface) { return _iface == interfaceType + String(num); })) {
								num++;
							}
							return [ interfaceType + String(num) ];
						}
					})
				}],
				layout: ['interfaceType', 'interface']
			});

			dialog.confirmForm({
				form: form,
				title: _('Select an interface type'),
				submit: _('Add interface')
			}).then(lang.hitch(this, function(formvals) {
				this._showWizard(lang.mixin({create: true}, props, formvals));
			}));
		},

		_showWizard: function(props) {
			// show an InterfaceWizard for the given props
			// and insert data into the grid when saving the new values
			var _dialog = null, wizard = null;

			var _cleanup = function() {
				_dialog.hide();
				_dialog.destroyRecursive();
			};

			var _finished = lang.hitch(this, function(values) {
				this.updateInterface(values, props.create);
				_cleanup();
			});
	
			var propvals = {
				values: props,
				'interface': props['interface'],
				interfaceType: props.interfaceType,
				physical_interfaces: this.physical_interfaces,
				available_interfaces: this.get('value'),
				create: props.create,
				onCancel: _cleanup,
				onFinished: _finished
			};
			wizard = new InterfaceWizard(propvals);

			_dialog = new Dialog({
				title: props.create ? _('Add a network interface') : _('Edit a network interface'),
				content: wizard
			});
			_dialog.own(wizard);
			this.own(_dialog);
			_dialog.show();
		},

		_removeInterface: function(ids) {
			// grid action
			array.forEach(ids, function(iid) {
				var iface = this.moduleStore.get(iid);
				if (iface.interfaceType === 'bond' || iface.interfaceType === 'br') {
					// enable the interfaces which were blocked by this interface
					var key = iface.interfaceType === 'bond' ? 'bond-slaves' : 'bridge_ports';

					// enable the blocked devices
					this.setDisabledItem(iface[key], false);

					// re set original values
					array.forEach(iface[key], lang.hitch(this, function(ikey) {
						var iiface = this.moduleStore.get(ikey);
						if (iiface.original) {
							this.moduleStore.put(iiface.original);
						}
					}));
				}

				// remove the interface from grid
				this.moduleStore.remove(iid);
			}, this);
		}

	});
});
