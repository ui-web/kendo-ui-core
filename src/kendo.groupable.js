(function ($, window) {
    var kendo = window.kendo,       
        Component = kendo.ui.Component,
        proxy = $.proxy,
        indicatorTmpl = kendo.template('<div class="t-group-indicator" data-field="${data.field}" data-dir="${data.dir || "asc"}">' + 
                '<a href="#" class="t-link">' +
                    '<span class="t-icon t-arrow-${(data.dir || "asc") == "asc" ? "up" : "down"}-small">(sorted ${(data.dir || "asc") == "asc" ? "ascending": "descending"})</span>' +
                    '${data.field}' + 
                '</a>' + 
                '<a class="t-button t-button-icon t-button-bare">' +
                    '<span class="t-icon t-group-delete"></span>' + 
                '</a>' +
             '</div>',  { useWithBlock:false }),
        groupContainer,
        hint = function(target) {                    
            return $('<div class="t-header t-drag-clue" />')
                .html(target.data("field"))
                .prepend('<span class="t-icon t-drag-status t-denied" />');
        },
        dropCue = $('<div class="t-grouping-dropclue"/>'),
        dropCuePositions = [];

    var Groupable = Component.extend({
        init: function(element, options) {
            var that = this;

            Component.fn.init.call(that, element, options);

            groupContainer = $(that.options.groupContainer, that.element)
                .kendoDropTarget({
                    dragenter: function(e) {
                        e.draggable.hint.find(".t-drag-status").removeClass("t-denied").addClass("t-add");
                        dropCue.css({top:3, left: 0}).appendTo(groupContainer);
                    },

                    dragleave: function(e) {
                        e.draggable.hint.find(".t-drag-status").removeClass("t-add").addClass("t-denied");
                        dropCue.remove();
                    },
                })
                .kendoDraggable({
                    filter: "div.t-group-indicator",
                    hint: hint,
                    dragend: function(e) {                        
                        that._dragEnd(this, e);
                    },
                    dragstart: function() {
                        this.hint.find(".t-drag-status").removeClass("t-denied").addClass("t-add");
                        that._dragStart();
                        dropCue.css({top:3, left: 0}).appendTo(groupContainer);                        
                    },
                    drag: function(e) {
                        that._drag(this, e);
                    }
                })
                .delegate(".t-button", "click", function(e) {
                    e.preventDefault();
                    that._removeIndicator($(this).parent());
                })
                .delegate(".t-link", "click", function(e) {
                    var current = $(this).parent(),
                        newIndicator = that.buildIndicator(current.data("field"), current.data("dir") == "asc" ? "desc" : "asc");
                                        
                    current.before(newIndicator).remove();
                    that._change();
                    e.preventDefault();
                });
            
            that.element.kendoDraggable({
                filter: that.options.filter,
                hint: hint,                
                dragend: function(e) {                    
                    that._dragEnd(this, e);                                                           
                },
                dragstart: function() {
                    that._dragStart();
                },
                drag: function(e) {
                    that._drag(this, e);
                }
            });  
            
            that.dataSource = that.options.dataSource;

            if(that.dataSource) {
                that.dataSource.bind("change", function() {
                    groupContainer.empty().append(
                        $.map(this.group() || [], function(item) {
                            return that.buildIndicator(item.field, item.dir);
                        }).join('')
                    );
                });
            }          
        },

        options: {
            filter: "th"
        },

        indicator: function(field) {
            return $.grep($(".t-group-indicator", groupContainer), function (item) 
                { 
                    return $(item).data("field") === field;
                })[0];
        },

        buildIndicator: function(field, dir) {            
            return indicatorTmpl({ field: field, dir: dir });
        },

        descriptors: function() {            
            return $.map($(".t-group-indicator", groupContainer), function(item) {
                item = $(item); 
                
                return {
                    field: item.data("field"),
                    dir: item.data("dir")
                };
            }); 
        },

        _removeIndicator: function(indicator) {
            indicator.remove();
            this._change();
        },

        _change: function() {
            var that = this;
            if(that.dataSource) {
                that.dataSource.group(that.descriptors());
            }            
        },

        _dragStart: function() {
            dropCuePositions = $.map($(".t-group-indicator", groupContainer), function(item) {
                item = $(item);
                var left = item.position().left;
                return {
                    left: left,
                    right: left + item.outerWidth(),
                    element: item
                };
            }); 
        },
        _drag: function(draggable, event) {
            if(!dropCue.is(":visible") || dropCuePositions.length == 0) {
                return;
            }
            
            var position = event.pageX,
                lastCuePosition = dropCuePositions[dropCuePositions.length - 1],
                right = lastCuePosition.right,
                marginLeft = parseInt(lastCuePosition.element.css("marginLeft")),
                marginRight = parseInt(lastCuePosition.element.css("marginRight"));
                            
            if(position >= right) {
                dropCue.css({ left: right + marginRight});                
            } else {
                position = $.grep(dropCuePositions, function(item) {
                    return item.left <= position && position <= item.right;
                })[0];

                if(position) {
                    dropCue.css({ left: position.left - marginLeft });                    
                }
            }
            
            console.log(dropCue.position().left);
        },
        _canDrop: function(source, target, position) {
            var next = source.next();
            return source[0] !== target[0] && (!next[0] || target[0] !== next[0] || position > next.position().left);
        }, 
        _dragEnd: function(draggable, event) {
            var that = this,                
                field = event.currentTarget.data("field"),
                sourceIndicator = that.indicator(field),
                targetIndicator,
                insertBefore = true,
                lastCuePosition = dropCuePositions[dropCuePositions.length - 1],
                right,
                position;
                
            if(draggable.dropped) {                
                if(lastCuePosition) {
                    right = lastCuePosition.right,                    
                    position = dropCue.position().left + parseInt(lastCuePosition.element.css("marginLeft"));

                    if(position >= right) {
                        targetIndicator = lastCuePosition.element;
                        insertBefore = false;
                    } else {
                        targetIndicator = $.grep(dropCuePositions, function(item) {
                            return item.left <= position && position <= item.right;
                        })[0].element;
                        insertBefore = true;
                    }
                             
                    if(that._canDrop($(sourceIndicator), targetIndicator, position)) {
                        if(insertBefore) {                            
                            targetIndicator.before(sourceIndicator || that.buildIndicator(field));
                        } else {                                                        
                            targetIndicator.after(sourceIndicator || that.buildIndicator(field));
                        }
                        
                        that._change();
                    }
                } else {
                    groupContainer.append(that.buildIndicator(field));
                    that._change();
                }

            } else {
                if(sourceIndicator) {
                    that._removeIndicator($(sourceIndicator));
                }
            }

            dropCue.remove();
            dropCuePositions = [];
        }
    });

    kendo.ui.plugin("Groupable", Groupable);

})(jQuery, window);
