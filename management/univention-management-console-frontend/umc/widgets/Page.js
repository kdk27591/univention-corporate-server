/*global console MyError dojo dojox dijit umc */

dojo.provide("umc.widgets.Page");

dojo.require("dijit.layout.BorderContainer");
dojo.require("umc.render");
dojo.require("umc.tools");
dojo.require("umc.widgets.Text");
dojo.require("umc.i18n");

dojo.declare("umc.widgets.Page", [ dijit.layout.BorderContainer, umc.i18n.Mixin ], {
	// summary:
	//		Class that abstracts a displayable page for a module.
	//		Offers the possibility to enter a help text that is shown or not
	//		depending on the user preferences.
	//		The widget itself is also a container such that children widgets
	//		may be adde via the 'addChild()' method.

	// helpText: String
	//		Text that describes the module, will be displayed at the top of a page.
	helpText: '',

	// headerText: String
	//		Text that will be displayed as header title.
	headerText: '&lt;Title missing&gt;',

	// footer: Object[]?
	//		Optional array of dicts that describes buttons that shall be added
	//		to the footer. The default button will be displayed on the right
	footerButtons: null,

	// title: String
	//		Title of the page. This option is necessary for tab pages.
	title: '',

	// noFooter: Boolean
	//		Disable the page footer.
	noFooter: false,

	// the widget's class name as CSS class
	'class': 'umcPage',

	i18nClass: 'umc.app',

	gutters: false,

	//style: 'width: 100%; height: 100%;',

	_helpTextPane: null,
	_headerTextPane: null,
	_subscriptionHandle: null,
	_footer: null,
	_notes: null,

	_setHelpTextAttr: function(newVal) {
		this.helpText = newVal;
		if (this._helpTextPane) {
			this._helpTextPane.set('content', newVal);
			this.layout();
		}
	},

	_setHeaderTextAttr: function(newVal) {
		this.headerText = newVal;
		if (this._headerTextPane) {
			this._headerTextPane.set('content', '<h1>' + newVal + '</h1>');
			this.layout();
		}
	},

	postMixInProperties: function() {
		this.inherited(arguments);

		// remove title from the attributeMap
		delete this.attributeMap.title;

		// initiate array for notes
		this._notes = [];
	},

	buildRendering: function() {
		this.inherited(arguments);

		// add the header
		this._headerTextPane = new umc.widgets.Text({
			content: '<h1>' + this.headerText + '</h1>',
			region: 'top',
			'class': 'umcPageHeader'
		});
		this.addChild(this._headerTextPane);

		if (umc.tools.preferences('moduleHelpText') && this.helpText) {
			// display the module helpText
			this._createHelpTextPane();
			this.addChild(this._helpTextPane, 1);
		}

		if (!this.noFooter) {
			// create the footer container(s)
			this._footer = new umc.widgets.ContainerWidget({
				region: 'bottom',
				'class': 'umcPageFooter'
			});
			this.addChild(this._footer);
			var footerLeft = new umc.widgets.ContainerWidget({
				style: 'float: left'
			});
			this._footer.addChild(footerLeft);
			var footerRight = new umc.widgets.ContainerWidget({
				style: 'float: right'
			});
			this._footer.addChild(footerRight);

			// render all buttons and add them to the footer
			if (this.footerButtons && dojo.isArray(this.footerButtons) && this.footerButtons.length) {
				var buttons = umc.render.buttons(this.footerButtons);
				dojo.forEach(buttons.$order$, function(ibutton) {
					if ('submit' == ibutton.type || ibutton.defaultButton) {
						footerRight.addChild(ibutton);
					}
					else {
						footerLeft.addChild(ibutton);
					}
				}, this);
			}
		}
	},

	postCreate: function() {
		this.inherited(arguments);

		// register for events to hide the help text information
		this._subscriptionHandle = dojo.subscribe('/umc/preferences/moduleHelpText', dojo.hitch(this, function(show) {
			if (false === show) {
				this.hideDescription();
			}
			else {
				this.showDescription();
			}
		}));
	},

	uninitialize: function() {
		// unsubscribe upon destruction
		dojo.unsubscribe(this._subscriptionHandle);
	},

	_createHelpTextPane: function() {
		this._helpTextPane = new umc.widgets.Text({
			content: this.helpText,
			region: 'top',
			'class': 'umcPageHelpText'
		});
	},

	addChild: function(child) {
		// use 'center' as default region
		if (!child.region) {
			child.region = 'center';
		}
		this.inherited(arguments);
	},

	showDescription: function() {
		// if we don't have a help text, ignore call
		if (this._helpTextPane || !this.helpText) {
			return;
		}

		// put the help text in a Text widget and then add it to the container
		// make the node transparent, yet displayable
		this._createHelpTextPane();
		dojo.style(this._helpTextPane.domNode, {
			opacity: 0,
			display: 'block'
		});
		this.addChild(this._helpTextPane, 1);
		//this.layout();

		// fade in the help text
		dojo.fadeIn({
			node: this._helpTextPane.domNode,
			duration: 500
		}).play();
	},

	hideDescription: function() {
		// if we don't have a help text visible, ignore call
		if (!this._helpTextPane) {
			return;
		}

		// fade out the help text
		dojo.fadeOut({
			node: this._helpTextPane.domNode,
			duration: 500,
			onEnd: dojo.hitch(this, function() {
				// remove the text from the layout and destroy widget
				this.removeChild(this._helpTextPane);
				this._helpTextPane.destroyRecursive();
				this._helpTextPane = null;
				//this.layout();
			})
		}).play();
	},

	addNote: function(message) {
		var closeButton = '<span class="dijitTabCloseButton dijitTabCloseIcon" style="float:right" title="Close"></span>';

		var note = new umc.widgets.Text({
			content: '<b>' + this._('Note') + ':</b> ' + closeButton + message,
			region: 'top',
			'class': 'umcPageNote'
		});
		dojo.query('.dijitTabCloseButton', note.domNode).forEach(function(inode) {
			this.connect(inode, 'onmousedown', function() {
				dojo.addClass(inode, 'dijitTabCloseButtonActive');
			});
			this.connect(inode, 'onmouseup', function() {
				dojo.removeClass(inode, 'dijitTabCloseButtonActive');
			});
			this.connect(inode, 'onmouseover', function() {
				dojo.addClass(inode, 'dijitTabCloseButtonHover');
			});
			this.connect(inode, 'onmouseout', function() {
				dojo.removeClass(inode, 'dijitTabCloseButtonHover');
			});
			this.connect(inode, 'onclick', function() {
				dojo.fadeOut({
					node: note.domNode,
					duration: 500,
					onEnd: dojo.hitch(this, function() {
						this.removeChild(note);
						note.destroyRecursive();
					})
				}).play();
			});
		}, this);
		this.addChild(note);
		return note;
	}
});


