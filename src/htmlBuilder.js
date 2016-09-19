/* jslint node: true */
/* global window */
'use strict';

/**
 * @class HTMLBuilder Creates an instance of a HTMLBuilder which turns HTML into document definition model
 */
function HTMLBuilder() {
    /**
     * Contains attributes of document definition with paths of subitems
     */
    var attributesWithChildren = [ 'text', 'stack', 'table body', 'columns', 'ol', 'ul' ];
    
    /**
     * Contains node processing functions of defined HTML tags
     */
    var htmlNodeTags = {
        'B': { tags: [ 'B', 'STRONG' ], action: function(node) { node.bold = true; } },
        'EM': { tags: [ 'I', 'EM' ], action: function(node) { node.italics = true; } }  
    };
    
    /**
     * Contains settings functions to process optional stack node attributes
     */
    var settingsActions = {
        verticalOffset: function(node, offset) {
            offset = parseFloat(offset);
            if (!isNaN(offset)) {
                node.margin = [ 0, 0, 0, offset ];
            }
        }
    };
    
    /**
     * Gets node processing action by HTML tag
     * 
     * @param {string} nodeType Contains type of node
     * @return {function} Returns action function for processing document definition node
     */
    var getHTMLActionByNodeType = function(nodeType) {
        if (htmlNodeTags[nodeType]) {
            return htmlNodeTags[nodeType].action;
        }
        for (var prop in htmlNodeTags) {
            if (htmlNodeTags[prop].tags.indexOf(nodeType) > -1) {
                return htmlNodeTags[prop].action;
            }
        }  
    };
    
    /**
	 * Get document definition text node of pdfmake from HTML tag
     * 
	 * @param {object} inner Contains node object to process
	 * @param {array} actions Contains array of HTML tag node functions
	 * @return {object} Returns pdfmake node with text content
	 */
	var getTextFromInner = function(inner, actions) {
        if (inner === undefined || inner === null || inner === '') {
            return undefined;
        }
        
        var keys = Object.keys(inner);
        var arr = [];
        
        for (var i = 0; i < keys.length; i++) {
            if (inner[keys[i]].inner === undefined) {
                var iText = inner[keys[i]];
                if (iText.trim() !== '') {
                    var node = { text: iText };
                    if (actions) {
                        for (var j = 0; j < actions.length; j++) {
                            actions[j](node); 
                        }
                    }
                    arr.push(node);   
                }
            }
            else {
                var objInner = inner[keys[i]];
                var task = getHTMLActionByNodeType(objInner.nodeType);
                if (task) {
                    if (actions === undefined) {
                        actions = [];
                    }
                    actions.push(task);
                    arr = arr.concat(getTextFromInner(objInner.inner, actions));
                    actions = [];
                }
            }
        }
        
        return arr;
    };
    
	/**
	 * Gets pdfmake text element from tag element with wrapper like <li><p>...</p></li>
     * 
	 * @param {object} inner Contains node object to process
	 * @return {object} Returns array of pdfmake text elements
	 */
	var getTextFromInnerWrapperElementList = function(inner) {
        var keys = Object.keys(inner);
        var listOfTextValues = [];
        
        for (var i = 0; i < keys.length; i++) {
            var iText = getTextFromInner(inner[keys[i]].inner);
            if (iText !== undefined && iText !== null) {
                listOfTextValues.push(iText);					
            }
        }
        
        return listOfTextValues;
    };
    
    /**
     * Gets node object of registered HTML tags
     * 
     * @param {object} node Contains object of node
     * @return {object} Returns object with document definition node 
     */
    var getHTMLTagByNodeType = function(node) {
        var nodeType = node.nodeType, item;
        
        if (nodeType) {
            switch (nodeType) {
                case '#text':
                case 'DIV':
                case 'P':
                    item = { text: getTextFromInner(node.inner) };
                    if (item.text.length == 0) {
                        item = undefined;
                    }
                    break;
                case 'OL':
                    item = { ol: getTextFromInnerWrapperElementList(node.inner) };
                    break;
                case 'UL':
                    item = { ul: getTextFromInnerWrapperElementList(node.inner) };
                    break;
            }   
        }
        
        return item;
    };
    
	/**
	 * Processes HTML markup to json object
     * 
	 * @param {string} markup Contains HTML markup for document definition of pdfmake
	 * @return {object} Returns converted json object of HTMLL markup
	 */
	var HTML2JSON = function(markup) {
		var html = document.createElement('html');
		html.innerHTML = '<div>' + markup + '</div>';
		var html_childs = html.childNodes;
		
		function GetNodes(children) {
			var obj = {};
			for (var i = 0; i < children.length; i++) {
				var node = children[i];
				var node_val = {};
				node_val = {
					nodeType : node.nodeName
				};
				
				if (node.nodeName === "#text") {
					node_val = node.data;	
				} 
                else {
					node_val.inner = GetNodes(node.childNodes);
					node_val.attributes = getAttributes(node);				
				}		
				obj[i] = node_val;
			}
			return obj === {} ? undefined : obj;
		}
		
		function getAttributes(node) {
			var attrs = node.attributes;
			var json_attrs = [];
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i];
				json_attrs.push({ name: attr.name, value: attr.nodeValue });
			}
			
			return json_attrs;
		}
        
		return GetNodes(html_childs);
	};
    
	/**
	 * Processes HTML json object to document definition of pdfmake
     * 
	 * @param {string} json Contains json object of HTML markup
     * @param {object} settings Contains optional object with additional settings
	 * @return {object} Returns stack with document definition of pdfmake
	 */
	var JSON2DocDef = function(json, settings) {
		var obj = { stack: [] };
        
		function getNodes(n) {
			var keys = Object.keys(n);
			for (var i = 0; i < keys.length; i++) {
				var node = n[keys[i]];
				var elm = getHTMLTagByNodeType(node);
                if (elm !== undefined) {
                    processAdditionalStackNodeSettings(settings, elm);
                    obj.stack.push(elm);
                }
                if (node.inner) {
                    getNodes(node.inner);   
                }
			}
		}

        getNodes(json);
        		
		return obj;
	};
    
    /**
     * Processes additional stack node settings
     * 
     * @param {object} settings Contains object with additional node settings
     * @param {object} node Contains stack node of document definition model
     */
    var processAdditionalStackNodeSettings = function(settings, node) {
        for (var prop in settings) {
            var func = settingsActions[prop];
            if (func) {
                func(node, settings[prop]);
            }
        }
    };
    
    /**
     * Gets document definition of pdfmake from html markup
     * 
     * @param {string} markup Contains html markup
     * @param {object} settings Contains optional object with additional settings
     * @return {object} Returns object with document definition of pdfmake
     */
    var getDocumentDefinitionFromHtmlMarkup = function(markup, settings) {
        if (typeof markup !== 'undefined') {
            return JSON2DocDef(HTML2JSON(markup), settings);
        }
    };
    
    /**
     * Processes document definition content of pdfmake
     * 
     * @param {object} content Contains document definition content of pdfmake
     */
    var processDocumentDefinition = function(content) {
        for (var i = 0; i < content.length; i++) {
            if (content[i] && typeof content[i] === 'object') {
                var html = content[i].html; 
                if (content[i].hasOwnProperty('html') || typeof html !== 'undefined') {
                    var stack = getDocumentDefinitionFromHtmlMarkup(html, content[i].settings || {});
                    if (!stack) {
                        stack = { text: '' };
                    }
                    copyPropertiesToTargetStack(content[i], stack);
                    content[i] = stack;
                }
                else {
                    var subs = getChildrenNode(content[i]);
                    if (typeof subs === 'object') {
                        processDocumentDefinition(subs);
                    }   
                }
            }
        }   
    };
    
    /**
     * Copies properties of source to target object
     * 
     * @param {object} objSrc Contains source object of properties
     * @param {object} objTarget Contains target object of properties
     */
    var copyPropertiesToTargetStack = function(objSrc, objTarget) {
        for (var prop in objSrc) {
            if (['html', 'settings'].indexOf(prop) == -1) {
                objTarget[prop] = objSrc[prop];    
            }
        }
    };
    
    /**
     * Gets the object attribute with sub nodes
     * 
     * @param {object} obj Contains node object
     * @return {array} Returns array of children nodes
     */
    var getChildrenNode = function(obj) {
        if (Array.isArray(obj)) { 
            return obj;
        }
        for (var i = 0; i < attributesWithChildren.length; i++) {
            var attr = attributesWithChildren[i].split(' ');
            if (obj.hasOwnProperty(attr[0])) {
                if (attr.length > 1) {
                    return findDeepObject(obj, attr);
                }
                else {
                    return obj[attr];
                }   
            }
        }
    };
    
    /**
     * Finds deep object of defined path
     * 
     * @param {object} obj Contains parent object
     * @param {array} path Contains path of deep object
     * @return {object} Returns deep object of path
     */
    var findDeepObject = function(obj, path) {
        var current = obj;
        for (var i = 0; i < path.length; ++i) {
            if (typeof current[path[i]] === 'undefined') {
                return undefined;
            } 
            else {
                current = current[path[i]];
            }
        }
        return current;
    };
    
    /**
     * Creates valid document definition for pdfmake of html markup
     * 
     * @param {object} docDefinition Contains document definition of pdfmake
     */
    this.setDocumentDefinition = function(docDefinition) {
        if (typeof docDefinition !== 'undefined' && docDefinition.content) {
            processDocumentDefinition(docDefinition.content);
        }
    }
}

module.exports = HTMLBuilder;