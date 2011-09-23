/*!
 * Gridpak
 *
 *
 * @author Erskine Design [Wil Linssen]
 */
$(function() {

    /**
     * Grid model
     *
     * @attribute (int) min_width
     * @attribute (int) col_num
     * @attribute (int) col_padding_width
     * @attribute (string) col_padding_type
     * @attribute (int) gutter_width
     * @attribute (string) gutter_type
     * @attribute (int) baseline_height
     * @attribute (int) current_width DO WE NEED THIS??
     * @attribute (int) lower
     * @attribute (int) upper
     * @attribute (boolean) current
     */
    window.Grid = Backbone.Model.extend({

        /**
         * Model defaults
         *
         */
        defaults: {
            min_width: 960,
            col_num: 16,
            col_padding_width: 10,
            col_padding_type: 'px',
            gutter_width: 8,
            gutter_type: 'px',
            baseline_height: 22,
            col_width: 0,
            position: 0,
            current: true
        },

        /**
         * Validate the model
         *
         * Backbone method
         *
         * @param (object) attrs
         * @return (string) error
         */
        validate: function(attrs) {

            var settings = {
                max_cols: 99,
                allowed_types: ['px', '%']
            };

            // I got 99 cols but a bitch ain't one
            if (attrs.col_num > settings.max_cols) {
                return 'Can\'t have more than ' + settings.max_cols + ' cols';
            }

            // Int params must be integers
            if (
                (typeof(attrs.min_width) != 'undefined' && !this.isInt(attrs.min_width)) ||
                (typeof(attrs.col_num) != 'undefined' && !this.isInt(attrs.col_num)) ||
                (typeof(attrs.col_padding_width) != 'undefined' && !this.isInt(attrs.col_padding_width)) ||
                (typeof(attrs.gutter_width) != 'undefined' && !this.isInt(attrs.gutter_width)) ||
                (typeof(attrs.baseline_height) != 'undefined' && !this.isInt(attrs.baseline_height))
            ) {
                return 'Use integers for integers';
            }

            // px or % params
            if (
                typeof(attrs.col_padding_type) != 'undefined' && _.indexOf(settings.allowed_types, attrs.col_padding_type) || 
                typeof(attrs.gutter_type) != 'undefined' && _.indexOf(settings.allowed_types, attrs.gutter_type)
            ) {
                return ('Wrong type of padding / gutter');
            }

        },

        /**
         * Validate var is integer
         *
         * @param (string) x
         * @return boolean
         */
        isInt: function(x) {
            var y = parseInt(x); 
            if (isNaN(y)) return false; 
            return x == y && x.toString() == y.toString(); 
         },

        /**
         * Update the models current width
         *
         */
        updateWidth: function(new_width) {
            var col_width = 0,
                col_padding = 0,
                gutter = 0;

            // fixed with gutters
            if (this.get('gutter_type') == 'px') {
                gutter_width = this.get('gutter_width');
            } else {
                gutter_width = Math.floor(((new_width / 100) * this.gutter_width));
            }

            // fixed percentage width padding
            if (this.get('col_padding_type') == 'px') {
                col_padding = this.get('col_padding_width');
            // work the width from percentages
            } else {
                col_padding = Math.floor((new_width / 100) * this.get('col_padding_width'));
            }

            col_width = Math.floor((new_width / this.get('col_num')) - gutter_width - (col_padding * 2));
            col_width += Math.floor(gutter_width / this.get('col_num'));

            this.set({ 
                col_width: col_width,
                current_width: new_width
            });

        },

    });

    /**
     * Grid collection
     *
     */
    window.GridList = Backbone.Collection.extend({

        model: Grid,

        current: false,

        url: '/',

        comparator: function(grid)
        {
            return grid.get('min_width');
        },

        determineUpperLowers: function() {
            var lower = 0,
                upper = false,
                i = 0
                size = 0,
                agrid = {};

            // get an iterator from the size of the collection
            i  = this.size() - 1;

            // Work on the grids at the limits
            // first the last
            agrid = this.at(i);
            upper = agrid.get('min_width');
            agrid.set({ upper: false, lower: upper, position: i });

            // then the first
            agrid = this.at(0);
            agrid.set({ lower: 0, position: 0 });

            // Now if there is only one (the first is also the last)
            if (i < 1) return;

            // The first grids max is the seconds min width
            bgrid = this.at(1);
            agrid.set({ upper: bgrid.get('min_width'), position: 1 });

            // Now if there are only 2
            if (i < 2) return;

            // We've done the last, so ditch that
            i--;
            // Now start top to bottom adding
            for(i; i>0; i--)
            {
                agrid = this.at(i);
                lower = agrid.get('min_width');
                agrid.set({ lower: lower, upper: upper, position: i })
                // the next upper will be this one's lower
                upper = lower;
            }

        }

    });

    // Use prototyping to add a check for the next and previous models
    // then assign the lower and upper limits accordingly
    GridList.prototype.add = function(grid) {
        if (this.current) {
            this.current.set({ current: false });
            this.current = grid;
        }
        Backbone.Collection.prototype.add.call(this, grid);
        this.determineUpperLowers();
    };

    window.Grids = new GridList([
        { min_width: 100, col_num: 4, col_padding_width: 5, col_padding_type: 'px', gutter_width: 8,  gutter_type: 'px', baseline_height: 22, current: false },
        { min_width: 500, col_num: 8, col_padding_width: 5, col_padding_type: 'px', gutter_width: 8,  gutter_type: 'px', baseline_height: 22, current: false },
        { min_width: 960, col_num: 16, col_padding_width: 10, col_padding_type: 'px', gutter_width: 8,  gutter_type: 'px', baseline_height: 22, current: true },
    ]);
    // Set the current grid as the last in the collection
    window.Grids.current = window.Grids.at(Grids.length - 1);

    /**
     * Grid info view
     *
     */
    window.GridView = Backbone.View.extend({

        tagName: 'li',

        template: _.template($('#grid_template').html()),

        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },

        events: {
            'click .remove' : 'clear'
        },

        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            this.stringify();
            return this;
        },

        stringify: function() {
            $('#stringified').val(JSON.stringify(Grids));
        },

        remove: function() {

            $(this.el).remove();
        },

        clear: function() {
            this.model.destroy();
            Grids.determineUpperLowers();
        }

    });

    /**
     * The application
     *
     */
    window.AppView = Backbone.View.extend({

        $browser: {},
        snap: 20,

        el: $('#gridpak'),

        events: {
            'click #save_grid': 'createGrid',
            'click #grid_options input[type="number"]': 'updateOptions',
            'keyup #grid_options input[type="number"]': 'updateOptions',
            'change #grid_options select': 'updateOptions'
        },

        initialize: function() {
            var that = this,
                width = 0;

            this.input = this.$('#grid_options');

            this.$browser = $('#browser').resizable({
                handles: { e: $(".dragme") },
                grid: this.snap,
                minWidth: 300,
                resize: function(e, ui) {
                    that.resize(e, ui);
                }
            });

            // Set the initial new min width / old width
            width = this.$browser.width();
            $('#new_min_width').val(width);

            // Create the views and render them to the DOM
            Grids.each(function(grid) {
                that.addGrid(grid);
            });

            // Bind this.addOne every time a new model is added to the collection
            Grids.bind('add', this.addOne, this);

            // Update the width of the current model
            this.updateWidth(width);
        },


        resize: function(e, ui) {
            var old_width = $('#new_min_width').val(),
                current_width = Math.round(ui.size.width / this.snap) * this.snap,
                current_id = Grids.current.get('position'),
                new_id = false;

            // ensure we only fire every time we snap to a new width
            if (old_width == current_width) return false;

            // If we're out of bounds of the grid, switch to a new one
            if (current_width < Grids.current.get('lower') || (Grids.current.get('upper') !== false && current_width > Grids.current.get('upper')))
            {
                // must now swap to the next view DOWN
                new_id = (current_width < Grids.current.get('lower')) ? current_id - 1 : current_id + 1;
                Grids.current.set({ current: false });
                Grids.current = Grids.at(new_id);
                Grids.current.set({ current: true });
                App.refreshOptions();
                return false;
            }

            this.updateWidth(current_width);

        },

        updateWidth: function(width) {

            // Store the browser's width
            $('#new_min_width').val(width);

            // Update the current model's widths
            Grids.current.updateWidth(width);

        },

        addGrid: function(grid) {
            var view = new GridView({ model: grid });
            this.$('#grid_list').append(view.render().el);
        },

        refreshOptions: function() {
            $('#new_min_width').val(Grids.current.get('min_width'));
            $('#new_col_num').val(Grids.current.get('col_num'));
            $('#new_col_padding_width').val(Grids.current.get('col_padding_width'));
            $('#new_col_padding_type').val(Grids.current.get('col_padding_type'));
            $('#new_gutter_width').val(Grids.current.get('gutter_width'));
            $('#new_gutter_type').val(Grids.current.get('gutter_type'));
            $('#new_baseline_height').val(Grids.current.get('baseline_height'));
        },

        updateOptions: function() {
            Grids.current.set({
                min_width: $('#new_min_width').val(),
                col_num: $('#new_col_num').val(),
                col_width: false,
                col_padding_width: $('#new_col_padding_width').val(),
                col_padding_type: $('#new_col_padding_type').val(),
                gutter_width: $('#new_gutter_width').val(),
                gutter_type: $('#new_gutter_type').val(),
                baseline_height: $('#new_baseline_height').val()
            });
            this.updateWidth(this.$browser.width());
        },

        createGrid: function(e) {

            var new_grid = new Grid({
                min_width: $('#new_min_width').val(),
                col_num: $('#new_col_num').val(),
                col_width: false,
                col_padding_width: $('#new_col_padding_width').val(),
                col_padding_type: $('#new_col_padding_type').val(),
                gutter_width: $('#new_gutter_width').val(),
                gutter_type: $('#new_gutter_type').val(),
                baseline_height: $('#new_baseline_height').val(),
                lower: 0,
                upper: 0,
                current: true
            });

            Grids.add(new_grid);
        },

        addOne: function(grid) {
            var view = new GridView({ model: grid });
            this.$('#grid_list').append(view.render().el);
        }

     });

     window.App = new AppView;

});
