class URIResolver {
    parseURI(uri) {
      var match = URIResolver.SCHEME.exec(uri);
      if (!match) {
        throw new Error("Bad URI value, no scheme: " + uri);
      }
      var parsed = {
        spec: uri
      };
      parsed.scheme = match[0].substring(0, match[0].length - 1);
      parsed.schemeSpecificPart = parsed.spec.substring(match[0].length);
      if (parsed.schemeSpecificPart.charAt(0) == '/' && parsed.schemeSpecificPart.charAt(1) == '/') {
        this.parseGeneric(parsed);
      } else {
        parsed.isGeneric = false;
      }
      parsed.normalize = function () {
        if (!this.isGeneric) {
          return;
        }
        if (this.segments.length == 0) {
          return;
        }
        // edge case of ending in "/."
        if (this.path.length > 1 && this.path.substring(this.path.length - 2) == "/.") {
          this.path = this.path.substring(0, this.path.length - 1);
          this.segments.splice(this.segments.length - 1, 1);
          this.schemeSpecificPart = "//" + this.authority + this.path;
          if (typeof this.query != "undefined") {
            this.schemeSpecificPart += "?" + this.query;
          }
          if (typeof this.fragment != "undefined") {
            this.schemeSpecificPart += "#" + this.fragment;
          }
          this.spec = this.scheme + ":" + this.schemeSpecificPart;
          return;
        }
        var end = this.path.charAt(this.path.length - 1);
        if (end != "/") {
          end = "";
        }
        for (var i = 0; i < this.segments.length; i++) {
          if (i > 0 && this.segments[i] == "..") {
            this.segments.splice(i - 1, 2);
            i -= 2;
          }
          if (this.segments[i] == ".") {
            this.segments.splice(i, 1);
            i--;
          }
        }
        this.path = this.segments.length == 0 ? "/" : "/" + this.segments.join("/") + end;
        this.schemeSpecificPart = "//" + this.authority + this.path;
        if (typeof this.query != "undefined") {
          this.schemeSpecificPart += "?" + this.query;
        }
        if (typeof this.fragment != "undefined") {
          this.schemeSpecificPart += "#" + this.fragment;
        }
        this.spec = this.scheme + ":" + this.schemeSpecificPart;
      };
      parsed.resolve = function (href) {
        if (!href) {
          return this.spec;
        }
        if (href.charAt(0) == '#') {
          var lastHash = this.spec.lastIndexOf('#');
          return lastHash < 0 ? this.spec + href : this.spec.substring(0, lastHash) + href;
        }
        if (!this.isGeneric) {
          throw new Error("Cannot resolve uri against non-generic URI: " + this.spec);
        }
        href.indexOf(':');
        if (href.charAt(0) == '/') {
          return this.scheme + "://" + this.authority + href;
        } else if (href.charAt(0) == '.' && href.charAt(1) == '/') {
          if (this.path.charAt(this.path.length - 1) == '/') {
            return this.scheme + "://" + this.authority + this.path + href.substring(2);
          } else {
            var last = this.path.lastIndexOf('/');
            return this.scheme + "://" + this.authority + this.path.substring(0, last) + href.substring(1);
          }
        } else if (URIResolver.SCHEME.test(href)) {
          return href;
        } else if (href.charAt(0) == "?") {
          return this.scheme + "://" + this.authority + this.path + href;
        } else {
          if (this.path.charAt(this.path.length - 1) == '/') {
            return this.scheme + "://" + this.authority + this.path + href;
          } else {
            var last = this.path.lastIndexOf('/');
            return this.scheme + "://" + this.authority + this.path.substring(0, last + 1) + href;
          }
        }
      };
      parsed.relativeTo = function (otherURI) {
        if (otherURI.scheme != this.scheme) {
          return this.spec;
        }
        if (!this.isGeneric) {
          throw new Error("A non generic URI cannot be made relative: " + this.spec);
        }
        if (!otherURI.isGeneric) {
          throw new Error("Cannot make a relative URI against a non-generic URI: " + otherURI.spec);
        }
        if (otherURI.authority != this.authority) {
          return this.spec;
        }
        var i = 0;
        for (; i < this.segments.length && i < otherURI.segments.length; i++) {
          if (this.segments[i] != otherURI.segments[i]) {
            //alert(this.path+" different from "+otherURI.path+" at '"+this.segments[i]+"' vs '"+otherURI.segments[i]+"'");
            var offset = otherURI.path.charAt(otherURI.path.length - 1) == '/' ? 0 : -1;
            var relative = "";
            for (var j = i; j < otherURI.segments.length + offset; j++) {
              relative += "../";
            }
            for (var j = i; j < this.segments.length; j++) {
              relative += this.segments[j];
              if (j + 1 < this.segments.length) {
                relative += "/";
              }
            }
            if (this.path.charAt(this.path.length - 1) == '/') {
              relative += "/";
            }
            return relative;
          }
        }
        if (this.segments.length == otherURI.segments.length) {
          return this.hash ? this.hash : this.query ? this.query : "";
        } else if (i < this.segments.length) {
          var relative = "";
          for (var j = i; j < this.segments.length; j++) {
            relative += this.segments[j];
            if (j + 1 < this.segments.length) {
              relative += "/";
            }
          }
          if (this.path.charAt(this.path.length - 1) == '/') {
            relative += "/";
          }
          return relative;
        } else {
          throw new Error("Cannot calculate a relative URI for " + this.spec + " against " + otherURI.spec);
        }
      };
      return parsed;
    }
    parseGeneric(parsed) {
      if (parsed.schemeSpecificPart.charAt(0) != '/' || parsed.schemeSpecificPart.charAt(1) != '/') {
        throw new Error("Generic URI values should start with '//':" + parsed.spec);
      }
      var work = parsed.schemeSpecificPart.substring(2);
      var pathStart = work.indexOf("/");
      parsed.authority = pathStart < 0 ? work : work.substring(0, pathStart);
      parsed.path = pathStart < 0 ? "" : work.substring(pathStart);
      var hash = parsed.path.indexOf('#');
      if (hash >= 0) {
        parsed.fragment = parsed.path.substring(hash + 1);
        parsed.path = parsed.path.substring(0, hash);
      }
      var questionMark = parsed.path.indexOf('?');
      if (questionMark >= 0) {
        parsed.query = parsed.path.substring(questionMark + 1);
        parsed.path = parsed.path.substring(0, questionMark);
      }
      if (parsed.path == "/" || parsed.path == "") {
        parsed.segments = [];
      } else {
        parsed.segments = parsed.path.split(/\//);
        if (parsed.segments.length > 0 && parsed.segments[0] == '' && parsed.path.length > 1 && parsed.path.charAt(1) != '/') {
          // empty segment at the start, remove it
          parsed.segments.shift();
        }
        if (parsed.segments.length > 0 && parsed.path.length > 0 && parsed.path.charAt(parsed.path.length - 1) == '/' && parsed.segments[parsed.segments.length - 1] == '') {
          // we may have an empty the end
          // check to see if it is legimate
          if (parsed.path.length > 1 && parsed.path.charAt(parsed.path.length - 2) != '/') {
            parsed.segments.pop();
          }
        }
        // check for non-escaped characters
        for (var i = 0; i < parsed.segments.length; i++) {
          var check = parsed.segments[i].split(/%[A-Za-z0-9][A-Za-z0-9]|[\ud800-\udfff][\ud800-\udfff]|[A-Za-z0-9\-\._~!$&'()*+,;=@:\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+/);
          for (var j = 0; j < check.length; j++) {
            if (check[j].length > 0) {
              throw new Error("Unecaped character " + check[j].charAt(0) + " (" + check[j].charCodeAt(0) + ") in URI " + parsed.spec);
            }
          }
        }
      }
      parsed.isGeneric = true;
    }
  }
  URIResolver.SCHEME = /^[A-Za-z][A-Za-z0-9\+\-\.]*\:/;
  
  const Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
  
  let RDFaProcessor$1 = class RDFaProcessor extends URIResolver {
    constructor(targetObject) {
      super();
      if (targetObject) {
        this.target = targetObject;
      } else {
        this.target = {
          graph: {
            subjects: {},
            prefixes: {},
            terms: {}
          }
        };
      }
      this.theOne = "_:" + new Date().getTime();
      this.language = null;
      this.vocabulary = null;
      this.blankCounter = 0;
      this.langAttributes = [{
        namespaceURI: "http://www.w3.org/XML/1998/namespace",
        localName: "lang"
      }];
      this.inXHTMLMode = false;
      this.absURIRE = /[\w\_\-]+:\S+/;
      this.finishedHandlers = [];
      this.init();
    }
    newBlankNode() {
      this.blankCounter++;
      return "_:" + this.blankCounter;
    }
    tokenize(str) {
      return RDFaProcessor.trim(str).split(/\s+/);
    }
    parseSafeCURIEOrCURIEOrURI(value, prefixes, base) {
      value = RDFaProcessor.trim(value);
      if (value.charAt(0) == '[' && value.charAt(value.length - 1) == ']') {
        value = value.substring(1, value.length - 1);
        value = value.trim(value);
        if (value.length == 0) {
          return null;
        }
        if (value == "_:") {
          // the one node
          return this.theOne;
        }
        return this.parseCURIE(value, prefixes, base);
      } else {
        return this.parseCURIEOrURI(value, prefixes, base);
      }
    }
    parseCURIE(value, prefixes, base) {
      var colon = value.indexOf(":");
      if (colon >= 0) {
        var prefix = value.substring(0, colon);
        if (prefix == "") {
          // default prefix
          var uri = prefixes[""];
          return uri ? uri + value.substring(colon + 1) : null;
        } else if (prefix == "_") {
          // blank node
          return "_:" + value.substring(colon + 1);
        } else if (RDFaProcessor.NCNAME.test(prefix)) {
          var uri = prefixes[prefix];
          if (uri) {
            return uri + value.substring(colon + 1);
          }
        }
      }
      return null;
    }
    parseCURIEOrURI(value, prefixes, base) {
      var curie = this.parseCURIE(value, prefixes, base);
      if (curie) {
        return curie;
      }
      return this.resolveAndNormalize(base, value);
    }
    parsePredicate(value, defaultVocabulary, terms, prefixes, base, ignoreTerms) {
      if (value == "") {
        return null;
      }
      var predicate = this.parseTermOrCURIEOrAbsURI(value, defaultVocabulary, ignoreTerms ? null : terms, prefixes, base);
      if (predicate && predicate.indexOf("_:") == 0) {
        return null;
      }
      return predicate;
    }
    parseTermOrCURIEOrURI(value, defaultVocabulary, terms, prefixes, base) {
      //alert("Parsing "+value+" with default vocab "+defaultVocabulary);
      value = RDFaProcessor.trim(value);
      var curie = this.parseCURIE(value, prefixes, base);
      if (curie) {
        return curie;
      } else {
        var term = terms[value];
        if (term) {
          return term;
        }
        var lcvalue = value.toLowerCase();
        term = terms[lcvalue];
        if (term) {
          return term;
        }
        if (defaultVocabulary && !this.absURIRE.exec(value)) {
          return defaultVocabulary + value;
        }
      }
      return this.resolveAndNormalize(base, value);
    }
    parseTermOrCURIEOrAbsURI(value, defaultVocabulary, terms, prefixes, base) {
      //alert("Parsing "+value+" with default vocab "+defaultVocabulary);
      value = RDFaProcessor.trim(value);
      var curie = this.parseCURIE(value, prefixes, base);
      if (curie) {
        return curie;
      } else if (terms) {
        if (defaultVocabulary && !this.absURIRE.exec(value)) {
          return defaultVocabulary + value;
        }
        var term = terms[value];
        if (term) {
          return term;
        }
        var lcvalue = value.toLowerCase();
        term = terms[lcvalue];
        if (term) {
          return term;
        }
      }
      if (this.absURIRE.exec(value)) {
        return this.resolveAndNormalize(base, value);
      }
      return null;
    }
    resolveAndNormalize(base, href) {
      var u = base.resolve(href);
      var parsed = this.parseURI(u);
      parsed.normalize();
      return parsed.spec;
    }
    parsePrefixMappings(str, target) {
      var values = this.tokenize(str);
      var prefix = null;
      for (var i = 0; i < values.length; i++) {
        if (values[i][values[i].length - 1] == ':') {
          prefix = values[i].substring(0, values[i].length - 1);
        } else if (prefix) {
          target[prefix] = this.target.baseURI ? this.target.baseURI.resolve(values[i]) : values[i];
          prefix = null;
        }
      }
    }
    copyMappings(mappings) {
      var newMappings = {};
      for (var k in mappings) {
        newMappings[k] = mappings[k];
      }
      return newMappings;
    }
    ancestorPath(node) {
      var path = "";
      while (node && node.nodeType != Node.DOCUMENT_NODE) {
        path = "/" + node.localName + path;
        node = node.parentNode;
      }
      return path;
    }
    setContext(node) {
      // We only recognized XHTML+RDFa 1.1 if the version is set propertyly
      if (node.localName == "html" && node.getAttribute("version") == "XHTML+RDFa 1.1") {
        this.setXHTMLContext();
      } else if (node.localName == "html" || node.namespaceURI == "http://www.w3.org/1999/xhtml") {
        if (node.ownerDocument.doctype) {
          if (node.ownerDocument.doctype.publicId == "-//W3C//DTD XHTML+RDFa 1.0//EN" && node.ownerDocument.doctype.systemId == "http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd") {
            console.log("WARNING: RDF 1.0 is not supported.  Defaulting to HTML5 mode.");
            this.setHTMLContext();
          } else if (node.ownerDocument.doctype.publicId == "-//W3C//DTD XHTML+RDFa 1.1//EN" && node.ownerDocument.doctype.systemId == "http://www.w3.org/MarkUp/DTD/xhtml-rdfa-2.dtd") {
            this.setXHTMLContext();
          } else {
            this.setHTMLContext();
          }
        } else {
          this.setHTMLContext();
        }
      } else {
        this.setXMLContext();
      }
    }
    setInitialContext() {
      this.vocabulary = null;
      // By default, the prefixes are terms are loaded to the RDFa 1.1. standard within the graph constructor
      this.langAttributes = [{
        namespaceURI: "http://www.w3.org/XML/1998/namespace",
        localName: "lang"
      }];
    }
    setXMLContext() {
      this.setInitialContext();
      this.inXHTMLMode = false;
      this.inHTMLMode = false;
    }
    setHTMLContext() {
      this.setInitialContext();
      this.langAttributes = [{
        namespaceURI: "http://www.w3.org/XML/1998/namespace",
        localName: "lang"
      }, {
        namespaceURI: null,
        localName: "lang"
      }];
      this.inXHTMLMode = false;
      this.inHTMLMode = true;
    }
    setXHTMLContext() {
      this.setInitialContext();
      this.inXHTMLMode = true;
      this.inHTMLMode = false;
      this.langAttributes = [{
        namespaceURI: "http://www.w3.org/XML/1998/namespace",
        localName: "lang"
      }, {
        namespaceURI: null,
        localName: "lang"
      }];
  
      // From http://www.w3.org/2011/rdfa-context/xhtml-rdfa-1.1
      this.target.graph.terms["alternate"] = "http://www.w3.org/1999/xhtml/vocab#alternate";
      this.target.graph.terms["appendix"] = "http://www.w3.org/1999/xhtml/vocab#appendix";
      this.target.graph.terms["bookmark"] = "http://www.w3.org/1999/xhtml/vocab#bookmark";
      this.target.graph.terms["cite"] = "http://www.w3.org/1999/xhtml/vocab#cite";
      this.target.graph.terms["chapter"] = "http://www.w3.org/1999/xhtml/vocab#chapter";
      this.target.graph.terms["contents"] = "http://www.w3.org/1999/xhtml/vocab#contents";
      this.target.graph.terms["copyright"] = "http://www.w3.org/1999/xhtml/vocab#copyright";
      this.target.graph.terms["first"] = "http://www.w3.org/1999/xhtml/vocab#first";
      this.target.graph.terms["glossary"] = "http://www.w3.org/1999/xhtml/vocab#glossary";
      this.target.graph.terms["help"] = "http://www.w3.org/1999/xhtml/vocab#help";
      this.target.graph.terms["icon"] = "http://www.w3.org/1999/xhtml/vocab#icon";
      this.target.graph.terms["index"] = "http://www.w3.org/1999/xhtml/vocab#index";
      this.target.graph.terms["last"] = "http://www.w3.org/1999/xhtml/vocab#last";
      this.target.graph.terms["license"] = "http://www.w3.org/1999/xhtml/vocab#license";
      this.target.graph.terms["meta"] = "http://www.w3.org/1999/xhtml/vocab#meta";
      this.target.graph.terms["next"] = "http://www.w3.org/1999/xhtml/vocab#next";
      this.target.graph.terms["prev"] = "http://www.w3.org/1999/xhtml/vocab#prev";
      this.target.graph.terms["previous"] = "http://www.w3.org/1999/xhtml/vocab#previous";
      this.target.graph.terms["section"] = "http://www.w3.org/1999/xhtml/vocab#section";
      this.target.graph.terms["stylesheet"] = "http://www.w3.org/1999/xhtml/vocab#stylesheet";
      this.target.graph.terms["subsection"] = "http://www.w3.org/1999/xhtml/vocab#subsection";
      this.target.graph.terms["start"] = "http://www.w3.org/1999/xhtml/vocab#start";
      this.target.graph.terms["top"] = "http://www.w3.org/1999/xhtml/vocab#top";
      this.target.graph.terms["up"] = "http://www.w3.org/1999/xhtml/vocab#up";
      this.target.graph.terms["p3pv1"] = "http://www.w3.org/1999/xhtml/vocab#p3pv1";
  
      // other
      this.target.graph.terms["related"] = "http://www.w3.org/1999/xhtml/vocab#related";
      this.target.graph.terms["role"] = "http://www.w3.org/1999/xhtml/vocab#role";
      this.target.graph.terms["transformation"] = "http://www.w3.org/1999/xhtml/vocab#transformation";
    }
    init() {}
    newSubjectOrigin(origin, subject) {}
    addTriple(origin, subject, predicate, object) {}
    process(node, options) {
      if (node.nodeType == Node.DOCUMENT_NODE) {
        node = node.documentElement;
        this.setContext(node);
      } else if (node.parentNode.nodeType == Node.DOCUMENT_NODE) {
        this.setContext(node);
      }
      var queue = [];
      // Fix for Firefox that includes the hash in the base URI
      var removeHash = function (baseURI) {
        var hash = baseURI.indexOf("#");
        if (hash >= 0) {
          baseURI = baseURI.substring(0, hash);
        }
        if (options && options.baseURIMap) {
          baseURI = options.baseURIMap(baseURI);
        }
        return baseURI;
      };
      queue.push({
        current: node,
        context: this.push(null, removeHash(node.baseURI))
      });
      while (queue.length > 0) {
        var item = queue.shift();
        if (item.parent) {
          // Sequence Step 14: list triple generation
          if (item.context.parent && item.context.parent.listMapping == item.listMapping) {
            // Skip a child context with exactly the same mapping
            continue;
          }
          //console.log("Generating lists for "+item.subject+", tag "+item.parent.localName);
          for (var predicate in item.listMapping) {
            var list = item.listMapping[predicate];
            if (list.length == 0) {
              this.addTriple(item.parent, item.subject, predicate, {
                type: RDFaProcessor.objectURI,
                value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
              });
              continue;
            }
            var bnodes = [];
            for (var i = 0; i < list.length; i++) {
              bnodes.push(this.newBlankNode());
              //this.newSubject(item.parent,bnodes[i]);
            }
  
            for (var i = 0; i < bnodes.length; i++) {
              this.addTriple(item.parent, bnodes[i], "http://www.w3.org/1999/02/22-rdf-syntax-ns#first", list[i]);
              this.addTriple(item.parent, bnodes[i], "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest", {
                type: RDFaProcessor.objectURI,
                value: i + 1 < bnodes.length ? bnodes[i + 1] : "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
              });
            }
            this.addTriple(item.parent, item.subject, predicate, {
              type: RDFaProcessor.objectURI,
              value: bnodes[0]
            });
          }
          continue;
        }
        var current = item.current;
        var context = item.context;
  
        //console.log("Tag: "+current.localName+", listMapping="+JSON.stringify(context.listMapping));
  
        // Sequence Step 1
        var skip = false;
        var newSubject = null;
        var currentObjectResource = null;
        var typedResource = null;
        var prefixes = context.prefixes;
        var prefixesCopied = false;
        var incomplete = [];
        var listMapping = context.listMapping;
        var listMappingDifferent = context.parent ? false : true;
        var language = context.language;
        var vocabulary = context.vocabulary;
  
        // TODO: the "base" element may be used for HTML+RDFa 1.1
        var base;
        if (!current.baseURI) {
          if (this.target.baseURI) {
            base = this.target.baseURI;
          } else {
            throw new Error('node.baseURI was null as baseURI must be specified as an option');
          }
        } else if (current.baseURI === 'about:blank') {
          if (this.target.baseURI) {
            base = this.target.baseURI;
          } else {
            throw new Error('node.baseURI is about:blank a valid URL must be provided with the baseURI option. If you use JSDOM call it with an `url` parameter or, set the baseURI option of this library');
          }
        } else {
          base = this.parseURI(removeHash(current.baseURI));
        }
        current.item = null;
  
        // Sequence Step 2: set the default vocabulary
        var vocabAtt = current.getAttributeNode("vocab");
        if (vocabAtt) {
          var value = RDFaProcessor.trim(vocabAtt.value);
          if (value.length > 0) {
            vocabulary = value;
            var baseSubject = base.spec;
            //this.newSubject(current,baseSubject);
            this.addTriple(current, baseSubject, "http://www.w3.org/ns/rdfa#usesVocabulary", {
              type: RDFaProcessor.objectURI,
              value: vocabulary
            });
          } else {
            vocabulary = this.vocabulary;
          }
        }
  
        // Sequence Step 3: IRI mappings
        // handle xmlns attributes
        for (var i = 0; i < current.attributes.length; i++) {
          var att = current.attributes[i];
          //if (att.namespaceURI=="http://www.w3.org/2000/xmlns/") {
          if (att.name.charAt(0) == "x" && att.name.indexOf("xmlns:") == 0) {
            if (!prefixesCopied) {
              prefixes = this.copyMappings(prefixes);
              prefixesCopied = true;
            }
            var prefix = att.name.substring(6);
            // TODO: resolve relative?
            var ref = RDFaProcessor.trim(att.value);
            prefixes[prefix] = this.target.baseURI ? this.target.baseURI.resolve(ref) : ref;
          }
        }
        // Handle prefix mappings (@prefix)
        var prefixAtt = current.getAttributeNode("prefix");
        if (prefixAtt) {
          if (!prefixesCopied) {
            prefixes = this.copyMappings(prefixes);
            prefixesCopied = true;
          }
          this.parsePrefixMappings(prefixAtt.value, prefixes);
        }
  
        // Sequence Step 4: language
        var xmlLangAtt = null;
        for (var i = 0; !xmlLangAtt && i < this.langAttributes.length; i++) {
          xmlLangAtt = current.getAttributeNodeNS(this.langAttributes[i].namespaceURI, this.langAttributes[i].localName);
        }
        if (xmlLangAtt) {
          var value = RDFaProcessor.trim(xmlLangAtt.value);
          if (value.length > 0) {
            language = value;
          } else {
            language = null;
          }
        }
        var relAtt = current.getAttributeNode("rel");
        var revAtt = current.getAttributeNode("rev");
        var typeofAtt = current.getAttributeNode("typeof");
        var propertyAtt = current.getAttributeNode("property");
        var datatypeAtt = current.getAttributeNode("datatype");
        var datetimeAtt = this.inHTMLMode ? current.getAttributeNode("datetime") : null;
        var contentAtt = current.getAttributeNode("content");
        var aboutAtt = current.getAttributeNode("about");
        var srcAtt = current.getAttributeNode("src");
        var resourceAtt = current.getAttributeNode("resource");
        var hrefAtt = current.getAttributeNode("href");
        var inlistAtt = current.getAttributeNode("inlist");
        var relAttPredicates = [];
        if (relAtt) {
          var values = this.tokenize(relAtt.value);
          for (var i = 0; i < values.length; i++) {
            var predicate = this.parsePredicate(values[i], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt != null);
            if (predicate) {
              relAttPredicates.push(predicate);
            }
          }
        }
        var revAttPredicates = [];
        if (revAtt) {
          var values = this.tokenize(revAtt.value);
          for (var i = 0; i < values.length; i++) {
            var predicate = this.parsePredicate(values[i], vocabulary, context.terms, prefixes, base, this.inHTMLMode && propertyAtt != null);
            if (predicate) {
              revAttPredicates.push(predicate);
            }
          }
        }
  
        // Section 3.1, bullet 7
        if (this.inHTMLMode && (relAtt != null || revAtt != null) && propertyAtt != null) {
          if (relAttPredicates.length == 0) {
            relAtt = null;
          }
          if (revAttPredicates.length == 0) {
            revAtt = null;
          }
        }
        if (relAtt || revAtt) {
          // Sequence Step 6: establish new subject and value
          if (aboutAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(aboutAtt.value, prefixes, base);
          }
          if (typeofAtt) {
            typedResource = newSubject;
          }
          if (!newSubject) {
            if (current.parentNode.nodeType == Node.DOCUMENT_NODE) {
              newSubject = removeHash(current.baseURI);
            } else if (context.parentObject) {
              // TODO: Verify: If the xml:base has been set and the parentObject is the baseURI of the parent, then the subject needs to be the new base URI
              newSubject = removeHash(current.parentNode.baseURI) == context.parentObject ? removeHash(current.baseURI) : context.parentObject;
            }
          }
          if (resourceAtt) {
            currentObjectResource = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
          }
          if (!currentObjectResource) {
            if (hrefAtt) {
              currentObjectResource = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
            } else if (srcAtt) {
              currentObjectResource = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
            } else if (typeofAtt && !aboutAtt && !(this.inXHTMLMode && (current.localName == "head" || current.localName == "body"))) {
              currentObjectResource = this.newBlankNode();
            }
          }
          if (typeofAtt && !aboutAtt && this.inXHTMLMode && (current.localName == "head" || current.localName == "body")) {
            typedResource = newSubject;
          } else if (typeofAtt && !aboutAtt) {
            typedResource = currentObjectResource;
          }
        } else if (propertyAtt && !contentAtt && !datatypeAtt) {
          // Sequence Step 5.1: establish a new subject
          if (aboutAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(aboutAtt.value, prefixes, base);
            if (typeofAtt) {
              typedResource = newSubject;
            }
          }
          if (!newSubject && current.parentNode.nodeType == Node.DOCUMENT_NODE) {
            newSubject = removeHash(current.baseURI);
            if (typeofAtt) {
              typedResource = newSubject;
            }
          } else if (!newSubject && context.parentObject) {
            // TODO: Verify: If the xml:base has been set and the parentObject is the baseURI of the parent, then the subject needs to be the new base URI
            newSubject = removeHash(current.parentNode.baseURI) == context.parentObject ? removeHash(current.baseURI) : context.parentObject;
          }
          if (typeofAtt && !typedResource) {
            if (resourceAtt) {
              typedResource = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
            }
            if (!typedResource && hrefAtt) {
              typedResource = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
            }
            if (!typedResource && srcAtt) {
              typedResource = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
            }
            if (!typedResource && (this.inXHTMLMode || this.inHTMLMode) && (current.localName == "head" || current.localName == "body")) {
              typedResource = newSubject;
            }
            if (!typedResource) {
              typedResource = this.newBlankNode();
            }
            currentObjectResource = typedResource;
          }
          //console.log(current.localName+", newSubject="+newSubject+", typedResource="+typedResource+", currentObjectResource="+currentObjectResource);
        } else {
          // Sequence Step 5.2: establish a new subject
          if (aboutAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(aboutAtt.value, prefixes, base);
          }
          if (!newSubject && resourceAtt) {
            newSubject = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
          }
          if (!newSubject && hrefAtt) {
            newSubject = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
          }
          if (!newSubject && srcAtt) {
            newSubject = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
          }
          if (!newSubject) {
            if (current.parentNode.nodeType == Node.DOCUMENT_NODE) {
              newSubject = removeHash(current.baseURI);
            } else if ((this.inXHTMLMode || this.inHTMLMode) && (current.localName == "head" || current.localName == "body")) {
              newSubject = removeHash(current.parentNode.baseURI) == context.parentObject ? removeHash(current.baseURI) : context.parentObject;
            } else if (typeofAtt) {
              newSubject = this.newBlankNode();
            } else if (context.parentObject) {
              // TODO: Verify: If the xml:base has been set and the parentObject is the baseURI of the parent, then the subject needs to be the new base URI
              newSubject = removeHash(current.parentNode.baseURI) == context.parentObject ? removeHash(current.baseURI) : context.parentObject;
              if (!propertyAtt) {
                skip = true;
              }
            }
          }
          if (typeofAtt) {
            typedResource = newSubject;
          }
        }
        if (newSubject) {
          //this.newSubject(current,newSubject);
          if (aboutAtt || resourceAtt || typedResource) {
            var id = newSubject;
            if (typeofAtt && !aboutAtt && !resourceAtt && currentObjectResource) {
              id = currentObjectResource;
            }
            //console.log("Setting data attribute for "+current.localName+" for subject "+id);
            this.newSubjectOrigin(current, id);
          }
        }
  
        // Sequence Step 7: generate type triple
        if (typedResource) {
          var values = this.tokenize(typeofAtt.value);
          for (var i = 0; i < values.length; i++) {
            var object = this.parseTermOrCURIEOrAbsURI(values[i], vocabulary, context.terms, prefixes, base);
            if (object) {
              this.addTriple(current, typedResource, RDFaProcessor.typeURI, {
                type: RDFaProcessor.objectURI,
                value: object
              });
            }
          }
        }
  
        // Sequence Step 8: new list mappings if there is a new subject
        //console.log("Step 8: newSubject="+newSubject+", context.parentObject="+context.parentObject);
        if (newSubject && newSubject != context.parentObject) {
          //console.log("Generating new list mapping for "+newSubject);
          listMapping = {};
          listMappingDifferent = true;
        }
  
        // Sequence Step 9: generate object triple
        if (currentObjectResource) {
          if (relAtt && inlistAtt) {
            for (var i = 0; i < relAttPredicates.length; i++) {
              var list = listMapping[relAttPredicates[i]];
              if (!list) {
                list = [];
                listMapping[relAttPredicates[i]] = list;
              }
              list.push({
                type: RDFaProcessor.objectURI,
                value: currentObjectResource
              });
            }
          } else if (relAtt) {
            for (var i = 0; i < relAttPredicates.length; i++) {
              this.addTriple(current, newSubject, relAttPredicates[i], {
                type: RDFaProcessor.objectURI,
                value: currentObjectResource
              });
            }
          }
          if (revAtt) {
            for (var i = 0; i < revAttPredicates.length; i++) {
              this.addTriple(current, currentObjectResource, revAttPredicates[i], {
                type: RDFaProcessor.objectURI,
                value: newSubject
              });
            }
          }
        } else {
          // Sequence Step 10: incomplete triples
          if (newSubject && !currentObjectResource && (relAtt || revAtt)) {
            currentObjectResource = this.newBlankNode();
            //alert(current.tagName+": generated blank node, newSubject="+newSubject+" currentObjectResource="+currentObjectResource);
          }
  
          if (relAtt && inlistAtt) {
            for (var i = 0; i < relAttPredicates.length; i++) {
              var list = listMapping[relAttPredicates[i]];
              if (!list) {
                list = [];
                listMapping[predicate] = list;
              }
              //console.log("Adding incomplete list for "+predicate);
              incomplete.push({
                predicate: relAttPredicates[i],
                list: list
              });
            }
          } else if (relAtt) {
            for (var i = 0; i < relAttPredicates.length; i++) {
              incomplete.push({
                predicate: relAttPredicates[i],
                forward: true
              });
            }
          }
          if (revAtt) {
            for (var i = 0; i < revAttPredicates.length; i++) {
              incomplete.push({
                predicate: revAttPredicates[i],
                forward: false
              });
            }
          }
        }
  
        // Step 11: Current property values
        if (propertyAtt) {
          var datatype = null;
          var content = null;
          if (datatypeAtt) {
            datatype = datatypeAtt.value == "" ? RDFaProcessor.PlainLiteralURI : this.parseTermOrCURIEOrAbsURI(datatypeAtt.value, vocabulary, context.terms, prefixes, base);
            if (datetimeAtt && !contentAtt) {
              content = datetimeAtt.value;
            } else {
              content = datatype == RDFaProcessor.XMLLiteralURI || datatype == RDFaProcessor.HTMLLiteralURI ? null : contentAtt ? contentAtt.value : current.textContent;
            }
          } else if (contentAtt) {
            datatype = RDFaProcessor.PlainLiteralURI;
            content = contentAtt.value;
          } else if (datetimeAtt) {
            content = datetimeAtt.value;
            datatype = RDFaProcessor.deriveDateTimeType(content);
            if (!datatype) {
              datatype = RDFaProcessor.PlainLiteralURI;
            }
          } else if (!relAtt && !revAtt) {
            if (resourceAtt) {
              content = this.parseSafeCURIEOrCURIEOrURI(resourceAtt.value, prefixes, base);
            }
            if (!content && hrefAtt) {
              content = this.resolveAndNormalize(base, encodeURI(hrefAtt.value));
            } else if (!content && srcAtt) {
              content = this.resolveAndNormalize(base, encodeURI(srcAtt.value));
            }
            if (content) {
              datatype = RDFaProcessor.objectURI;
            }
          }
          if (!datatype) {
            if (typeofAtt && !aboutAtt) {
              datatype = RDFaProcessor.objectURI;
              content = typedResource;
            } else {
              content = current.textContent;
              if (this.inHTMLMode && current.localName == "time") {
                datatype = RDFaProcessor.deriveDateTimeType(content);
              }
              if (!datatype) {
                datatype = RDFaProcessor.PlainLiteralURI;
              }
            }
          }
          var values = this.tokenize(propertyAtt.value);
          for (var i = 0; i < values.length; i++) {
            var predicate = this.parsePredicate(values[i], vocabulary, context.terms, prefixes, base);
            if (predicate) {
              if (inlistAtt) {
                var list = listMapping[predicate];
                if (!list) {
                  list = [];
                  listMapping[predicate] = list;
                }
                list.push(datatype == RDFaProcessor.XMLLiteralURI || datatype == RDFaProcessor.HTMLLiteralURI ? {
                  type: datatype,
                  value: current.childNodes
                } : {
                  type: datatype ? datatype : RDFaProcessor.PlainLiteralURI,
                  value: content,
                  language: language
                });
              } else {
                if (datatype == RDFaProcessor.XMLLiteralURI || datatype == RDFaProcessor.HTMLLiteralURI) {
                  this.addTriple(current, newSubject, predicate, {
                    type: datatype,
                    value: current.childNodes
                  });
                } else {
                  this.addTriple(current, newSubject, predicate, {
                    type: datatype ? datatype : RDFaProcessor.PlainLiteralURI,
                    value: content,
                    language: language
                  });
                  //console.log(newSubject+" "+predicate+"="+content);
                }
              }
            }
          }
        }
  
        // Sequence Step 12: complete incomplete triples with new subject
        if (newSubject && !skip) {
          for (var i = 0; i < context.incomplete.length; i++) {
            if (context.incomplete[i].list) {
              //console.log("Adding subject "+newSubject+" to list for "+context.incomplete[i].predicate);
              // TODO: it is unclear what to do here
              context.incomplete[i].list.push({
                type: RDFaProcessor.objectURI,
                value: newSubject
              });
            } else if (context.incomplete[i].forward) {
              //console.log(current.tagName+": completing forward triple "+context.incomplete[i].predicate+" with object="+newSubject);
              this.addTriple(current, context.subject, context.incomplete[i].predicate, {
                type: RDFaProcessor.objectURI,
                value: newSubject
              });
            } else {
              //console.log(current.tagName+": completing reverse triple with object="+context.subject);
              this.addTriple(current, newSubject, context.incomplete[i].predicate, {
                type: RDFaProcessor.objectURI,
                value: context.subject
              });
            }
          }
        }
        var childContext = null;
        var listSubject = newSubject;
        if (skip) {
          // TODO: should subject be null?
          childContext = this.push(context, context.subject);
          // TODO: should the entObject be passed along?  If not, then intermediary children will keep properties from being associated with incomplete triples.
          // TODO: Verify: if the current baseURI has changed and the parentObject is the parent's base URI, then the baseURI should change
          childContext.parentObject = removeHash(current.parentNode.baseURI) == context.parentObject ? removeHash(current.baseURI) : context.parentObject;
          childContext.incomplete = context.incomplete;
          childContext.language = language;
          childContext.prefixes = prefixes;
          childContext.vocabulary = vocabulary;
        } else {
          childContext = this.push(context, newSubject);
          childContext.parentObject = currentObjectResource ? currentObjectResource : newSubject ? newSubject : context.subject;
          childContext.prefixes = prefixes;
          childContext.incomplete = incomplete;
          if (currentObjectResource) {
            //console.log("Generating new list mapping for "+currentObjectResource);
            listSubject = currentObjectResource;
            listMapping = {};
            listMappingDifferent = true;
          }
          childContext.listMapping = listMapping;
          childContext.language = language;
          childContext.vocabulary = vocabulary;
        }
        if (listMappingDifferent) {
          //console.log("Pushing list parent "+current.localName);
          queue.unshift({
            parent: current,
            context: context,
            subject: listSubject,
            listMapping: listMapping
          });
        }
        for (var child = current.lastChild; child; child = child.previousSibling) {
          if (child.nodeType == Node.ELEMENT_NODE) {
            //console.log("Pushing child "+child.localName);
            queue.unshift({
              current: child,
              context: childContext
            });
          }
        }
      }
      if (this.inHTMLMode) {
        this.copyProperties();
      }
      for (var i = 0; i < this.finishedHandlers.length; i++) {
        this.finishedHandlers[i](node);
      }
    }
    copyProperties() {}
    push(parent, subject) {
      return {
        parent: parent,
        subject: subject ? subject : parent ? parent.subject : null,
        parentObject: null,
        incomplete: [],
        listMapping: parent ? parent.listMapping : {},
        language: parent ? parent.language : this.language,
        prefixes: parent ? parent.prefixes : this.target.graph.prefixes,
        terms: parent ? parent.terms : this.target.graph.terms,
        vocabulary: parent ? parent.vocabulary : this.vocabulary
      };
    }
  };
  RDFaProcessor$1.XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
  RDFaProcessor$1.HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
  RDFaProcessor$1.PlainLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral";
  RDFaProcessor$1.objectURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object";
  RDFaProcessor$1.typeURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  RDFaProcessor$1.nameChar = '[-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF\.0-9\u00B7\u0300-\u036F\u203F-\u2040]';
  RDFaProcessor$1.nameStartChar = '[\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3\u4E00-\u9FA5\u3007\u3021-\u3029_]';
  RDFaProcessor$1.NCNAME = new RegExp('^' + RDFaProcessor$1.nameStartChar + RDFaProcessor$1.nameChar + '*$');
  RDFaProcessor$1.trim = function (str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  };
  RDFaProcessor$1.dateTimeTypes = [{
    pattern: /-?P(?:[0-9]+Y)?(?:[0-9]+M)?(?:[0-9]+D)?(?:T(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+(?:\.[0-9]+)?S)?)?/,
    type: "http://www.w3.org/2001/XMLSchema#duration"
  }, {
    pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9]T(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
    type: "http://www.w3.org/2001/XMLSchema#dateTime"
  }, {
    pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]-[0-9][0-9](?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
    type: "http://www.w3.org/2001/XMLSchema#date"
  }, {
    pattern: /(?:[0-1][0-9]|2[0-4]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+\-][0-9][0-9]:[0-9][0-9])?/,
    type: "http://www.w3.org/2001/XMLSchema#time"
  }, {
    pattern: /-?(?:[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9])-[0-9][0-9]/,
    type: "http://www.w3.org/2001/XMLSchema#gYearMonth"
  }, {
    pattern: /-?[1-9][0-9][0-9][0-9]|0[1-9][0-9][0-9]|00[1-9][0-9]|000[1-9]/,
    type: "http://www.w3.org/2001/XMLSchema#gYear"
  }];
  RDFaProcessor$1.deriveDateTimeType = function (value) {
    for (var i = 0; i < RDFaProcessor$1.dateTimeTypes.length; i++) {
      //console.log("Checking "+value+" against "+RDFaProcessor.dateTimeTypes[i].type);
      var matched = RDFaProcessor$1.dateTimeTypes[i].pattern.exec(value);
      if (matched && matched[0].length == value.length) {
        //console.log("Matched!");
        return RDFaProcessor$1.dateTimeTypes[i].type;
      }
    }
    return null;
  };
  
  class RDFaGraph {
    constructor() {
      var dataContext = this;
      this.curieParser = {
        trim: function (str) {
          return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        },
        parse: function (value, resolve) {
          value = this.trim(value);
          if (value.charAt(0) == '[' && value.charAt(value.length - 1) == ']') {
            value = value.substring(1, value.length - 1);
          }
          var colon = value.indexOf(":");
          if (colon >= 0) {
            var prefix = value.substring(0, colon);
            if (prefix == "") {
              // default prefix
              var uri = dataContext.prefixes[""];
              return uri ? uri + value.substring(colon + 1) : null;
            } else if (prefix == "_") {
              // blank node
              return "_:" + value.substring(colon + 1);
            } else if (DocumentData.NCNAME.test(prefix)) {
              var uri = dataContext.prefixes[prefix];
              if (uri) {
                return uri + value.substring(colon + 1);
              }
            }
          }
          return resolve ? dataContext.baseURI.resolve(value) : value;
        }
      };
      this.base = null;
      this.toString = function (requestOptions) {
        var options = requestOptions && requestOptions.shorten ? {
          graph: this,
          shorten: true,
          prefixesUsed: {}
        } : null;
        if (requestOptions && requestOptions.blankNodePrefix) {
          options.filterBlankNode = function (id) {
            return "_:" + requestOptions.blankNodePrefix + id.substring(2);
          };
        }
        if (requestOptions && requestOptions.numericalBlankNodePrefix) {
          var onlyNumbers = /^[0-9]+$/;
          options.filterBlankNode = function (id) {
            var label = id.substring(2);
            return onlyNumbers.test(label) ? "_:" + requestOptions.numericalBlankNodePrefix + label : id;
          };
        }
        var s = "";
        for (var subject in this.subjects) {
          var snode = this.subjects[subject];
          s += snode.toString(options);
          s += "\n";
        }
        var prolog = requestOptions && requestOptions.baseURI ? "@base <" + baseURI + "> .\n" : "";
        if (options && options.shorten) {
          for (var prefix in options.prefixesUsed) {
            prolog += "@prefix " + prefix + ": <" + this.prefixes[prefix] + "> .\n";
          }
        }
        return prolog.length == 0 ? s : prolog + "\n" + s;
      };
      this.blankNodeCounter = 0;
      this.clear = function () {
        this.subjects = {};
        this.prefixes = {};
        this.terms = {};
        this.blankNodeCounter = 0;
      };
      this.clear();
      this.prefixes[""] = "http://www.w3.org/1999/xhtml/vocab#";
  
      // w3c
      this.prefixes["grddl"] = "http://www.w3.org/2003/g/data-view#";
      this.prefixes["ma"] = "http://www.w3.org/ns/ma-ont#";
      this.prefixes["owl"] = "http://www.w3.org/2002/07/owl#";
      this.prefixes["rdf"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
      this.prefixes["rdfa"] = "http://www.w3.org/ns/rdfa#";
      this.prefixes["rdfs"] = "http://www.w3.org/2000/01/rdf-schema#";
      this.prefixes["rif"] = "http://www.w3.org/2007/rif#";
      this.prefixes["skos"] = "http://www.w3.org/2004/02/skos/core#";
      this.prefixes["skosxl"] = "http://www.w3.org/2008/05/skos-xl#";
      this.prefixes["wdr"] = "http://www.w3.org/2007/05/powder#";
      this.prefixes["void"] = "http://rdfs.org/ns/void#";
      this.prefixes["wdrs"] = "http://www.w3.org/2007/05/powder-s#";
      this.prefixes["xhv"] = "http://www.w3.org/1999/xhtml/vocab#";
      this.prefixes["xml"] = "http://www.w3.org/XML/1998/namespace";
      this.prefixes["xsd"] = "http://www.w3.org/2001/XMLSchema#";
      // non-rec w3c
      this.prefixes["sd"] = "http://www.w3.org/ns/sparql-service-description#";
      this.prefixes["org"] = "http://www.w3.org/ns/org#";
      this.prefixes["gldp"] = "http://www.w3.org/ns/people#";
      this.prefixes["cnt"] = "http://www.w3.org/2008/content#";
      this.prefixes["dcat"] = "http://www.w3.org/ns/dcat#";
      this.prefixes["earl"] = "http://www.w3.org/ns/earl#";
      this.prefixes["ht"] = "http://www.w3.org/2006/http#";
      this.prefixes["ptr"] = "http://www.w3.org/2009/pointers#";
      // widely used
      this.prefixes["cc"] = "http://creativecommons.org/ns#";
      this.prefixes["ctag"] = "http://commontag.org/ns#";
      this.prefixes["dc"] = "http://purl.org/dc/terms/";
      this.prefixes["dcterms"] = "http://purl.org/dc/terms/";
      this.prefixes["foaf"] = "http://xmlns.com/foaf/0.1/";
      this.prefixes["gr"] = "http://purl.org/goodrelations/v1#";
      this.prefixes["ical"] = "http://www.w3.org/2002/12/cal/icaltzd#";
      this.prefixes["og"] = "http://ogp.me/ns#";
      this.prefixes["rev"] = "http://purl.org/stuff/rev#";
      this.prefixes["sioc"] = "http://rdfs.org/sioc/ns#";
      this.prefixes["v"] = "http://rdf.data-vocabulary.org/#";
      this.prefixes["vcard"] = "http://www.w3.org/2006/vcard/ns#";
      this.prefixes["schema"] = "http://schema.org/";
  
      // terms
      this.terms["describedby"] = "http://www.w3.org/2007/05/powder-s#describedby";
      this.terms["license"] = "http://www.w3.org/1999/xhtml/vocab#license";
      this.terms["role"] = "http://www.w3.org/1999/xhtml/vocab#role";
      Object.defineProperty(this, "tripleCount", {
        enumerable: true,
        configurable: false,
        get: function () {
          var count = 0;
          for (var s in this.subjects) {
            var snode = this.subjects[s];
            for (var p in snode.predicates) {
              count += snode.predicates[p].objects.length;
            }
          }
          return count;
        }
      });
    }
    newBlankNode() {
      this.blankNodeCounter++;
      return "_:" + this.blankNodeCounter;
    }
    expand(curie) {
      return this.curieParser.parse(curie, true);
    }
    shorten(uri, prefixesUsed) {
      for (prefix in this.prefixes) {
        var mapped = this.prefixes[prefix];
        if (uri.indexOf(mapped) == 0) {
          if (prefixesUsed) {
            prefixesUsed[prefix] = mapped;
          }
          return prefix + ":" + uri.substring(mapped.length);
        }
      }
      return null;
    }
    add(subject, predicate, object, options) {
      if (!subject || !predicate || !object) {
        return;
      }
      subject = this.expand(subject);
      predicate = this.expand(predicate);
      var snode = this.subjects[subject];
      if (!snode) {
        snode = new RDFaSubject(this, subject);
        this.subjects[subject] = snode;
      }
      if (options && options.origin) {
        snode.origins.push(options.origin);
      }
      if (predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
        snode.types.push(object);
      }
      var pnode = snode.predicates[predicate];
      if (!pnode) {
        pnode = new RDFaPredicate(predicate);
        snode.predicates[predicate] = pnode;
      }
      if (typeof object == "string") {
        pnode.objects.push({
          type: RDFaProcessor.PlainLiteralURI,
          value: object
        });
      } else {
        pnode.objects.push({
          type: object.type ? this.expand(object.type) : RDFaProcessor.PlainLiteralURI,
          value: object.value ? object.value : "",
          origin: object.origin,
          language: object.language
        });
      }
    }
    addCollection(subject, predicate, objectList, options) {
      if (!subject || !predicate || !objectList) {
        return;
      }
      var lastSubject = subject;
      var lastPredicate = predicate;
      for (var i = 0; i < objectList.length; i++) {
        var object = {
          type: options && options.type ? options.type : "rdf:PlainLiteral"
        };
        if (options && options.language) {
          object.language = options.language;
        }
        if (options && options.datatype) {
          object.datatype = options.datatype;
        }
        if (typeof objectList[i] == "object") {
          object.value = objectList[i].value ? objectList[i].value : "";
          if (objectList[i].type) {
            object.type = objectList[i].type;
          }
          if (objectList[i].language) {
            object.language = objectList[i].language;
          }
          if (objectList[i].datatype) {
            object.datatype = objectList[i].datatype;
          }
        } else {
          object.value = objectList[i];
        }
        var bnode = this.newBlankNode();
        this.add(lastSubject, lastPredicate, {
          type: "rdf:object",
          value: bnode
        });
        this.add(bnode, "rdf:first", object);
        lastSubject = bnode;
        lastPredicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
      }
      this.add(lastSubject, lastPredicate, {
        type: "rdf:object",
        value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
      });
    }
    remove(subject, predicate) {
      if (!subject) {
        this.subjects = {};
        return;
      }
      subject = this.expand(subject);
      var snode = this.subjects[snode];
      if (!snode) {
        return;
      }
      if (!predicate) {
        delete this.subjects[subject];
        return;
      }
      predicate = this.expand(predicate);
      delete snode.predicates[predicate];
    }
  }
  class RDFaSubject {
    constructor(graph, subject) {
      this.graph = graph;
      // TODO: subject or id?
      this.subject = subject;
      this.id = subject;
      this.predicates = {};
      this.origins = [];
      this.types = [];
    }
    toString(options) {
      var s = null;
      if (this.subject.substring(0, 2) == "_:") {
        if (options && options.filterBlankNode) {
          s = options.filterBlankNode(this.subject);
        } else {
          s = this.subject;
        }
      } else if (options && options.shorten) {
        s = this.graph.shorten(this.subject, options.prefixesUsed);
        if (!s) {
          s = "<" + this.subject + ">";
        }
      } else {
        s = "<" + this.subject + ">";
      }
      var first = true;
      for (var predicate in this.predicates) {
        if (!first) {
          s += ";\n";
        } else {
          first = false;
        }
        s += " " + this.predicates[predicate].toString(options);
      }
      s += " .";
      return s;
    }
    toObject() {
      var o = {
        subject: this.subject,
        predicates: {}
      };
      for (var predicate in this.predicates) {
        var pnode = this.predicates[predicate];
        var p = {
          predicate: predicate,
          objects: []
        };
        o.predicates[predicate] = p;
        for (var i = 0; i < pnode.objects.length; i++) {
          var object = pnode.objects[i];
          if (object.type == RDFaProcessor.XMLLiteralURI) {
            var serializer = new XMLSerializer();
            var value = "";
            for (var x = 0; x < object.value.length; x++) {
              if (object.value[x].nodeType == Node.ELEMENT_NODE) {
                value += serializer.serializeToString(object.value[x]);
              } else if (object.value[x].nodeType == Node.TEXT_NODE) {
                value += object.value[x].nodeValue;
              }
            }
            p.objects.push({
              type: object.type,
              value: value,
              language: object.language
            });
          } else if (object.type == RDFaProcessor.HTMLLiteralURI) {
            var value = object.value.length == 0 ? "" : object.value[0].parentNode.innerHTML;
            p.objects.push({
              type: object.type,
              value: value,
              language: object.language
            });
          } else {
            p.objects.push({
              type: object.type,
              value: object.value,
              language: object.language
            });
          }
        }
      }
      return o;
    }
    getValues() {
      var values = [];
      for (var i = 0; i < arguments.length; i++) {
        var property = this.graph.curieParser.parse(arguments[i], true);
        var pnode = this.predicates[property];
        if (pnode) {
          for (var j = 0; j < pnode.objects.length; j++) {
            values.push(pnode.objects[j].value);
          }
        }
      }
      return values;
    }
  }
  class RDFaPredicate {
    constructor(predicate) {
      this.id = predicate;
      this.predicate = predicate;
      this.objects = [];
    }
    toString(options) {
      var s = null;
      if (options && options.shorten && options.graph) {
        s = options.graph.shorten(this.predicate, options.prefixesUsed);
        if (!s) {
          s = "<" + this.predicate + ">";
        }
      } else {
        s = "<" + this.predicate + ">";
      }
      s += " ";
      for (var i = 0; i < this.objects.length; i++) {
        if (i > 0) {
          s += ", ";
        }
        if (this.objects[i].type == "http://www.w3.org/1999/02/22-rdf-syntax-ns#object") {
          if (this.objects[i].value.substring(0, 2) == "_:") {
            if (options && options.filterBlankNode) {
              s += options.filterBlankNode(this.objects[i].value);
            } else {
              s += this.objects[i].value;
            }
          } else if (options && options.shorten && options.graph) {
            u = options.graph.shorten(this.objects[i].value, options.prefixesUsed);
            if (u) {
              s += u;
            } else {
              s += "<" + this.objects[i].value + ">";
            }
          } else {
            s += "<" + this.objects[i].value + ">";
          }
        } else if (this.objects[i].type == "http://www.w3.org/2001/XMLSchema#integer" || this.objects[i].type == "http://www.w3.org/2001/XMLSchema#decimal" || this.objects[i].type == "http://www.w3.org/2001/XMLSchema#double" || this.objects[i].type == "http://www.w3.org/2001/XMLSchema#boolean") {
          s += '"' + this.objects[i].value + '"' + "^^<" + this.objects[i].type + ">";
        } else if (this.objects[i].type == "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral") {
          var serializer = new XMLSerializer();
          var value = "";
          for (var x = 0; x < this.objects[i].value.length; x++) {
            if (this.objects[i].value[x].nodeType == Node.ELEMENT_NODE) {
              var prefixMap = RDFaPredicate.getPrefixMap(this.objects[i].value[x]);
              var prefixes = [];
              for (var prefix in prefixMap) {
                prefixes.push(prefix);
              }
              prefixes.sort();
              var e = this.objects[i].value[x].cloneNode(true);
              for (var p = 0; p < prefixes.length; p++) {
                e.setAttributeNS("http://www.w3.org/2000/xmlns/", prefixes[p].length == 0 ? "xmlns" : "xmlns:" + prefixes[p], prefixMap[prefixes[p]]);
              }
              value += serializer.serializeToString(e);
            } else if (this.objects[i].value[x].nodeType == Node.TEXT_NODE) {
              value += this.objects[i].value[x].nodeValue;
            }
          }
          s += '"""' + value.replace(/"""/g, "\\\"\\\"\\\"") + '"""^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral>';
        } else if (this.objects[i].type == "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML") {
          // We can use innerHTML as a shortcut from the parentNode if the list is not empty
          if (this.objects[i].value.length == 0) {
            s += '""""""^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML>';
          } else {
            s += '"""' + this.objects[i].value[0].parentNode.innerHTML.replace(/"""/g, "\\\"\\\"\\\"") + '"""^^<http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML>';
          }
        } else {
          var l = this.objects[i].value.toString();
          if (l.indexOf("\n") >= 0 || l.indexOf("\r") >= 0) {
            s += '"""' + l.replace(/"""/g, "\\\"\\\"\\\"") + '"""';
          } else {
            s += '"' + l.replace(/"/g, "\\\"") + '"';
          }
          if (this.objects[i].type != "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral") {
            s += "^^<" + this.objects[i].type + ">";
          } else if (this.objects[i].language) {
            s += "@" + this.objects[i].language;
          }
        }
      }
      return s;
    }
  }
  RDFaPredicate.getPrefixMap = function (e) {
    var prefixMap = {};
    while (e.attributes) {
      for (var i = 0; i < e.attributes.length; i++) {
        if (e.attributes[i].namespaceURI == "http://www.w3.org/2000/xmlns/") {
          var prefix = e.attributes[i].localName;
          if (e.attributes[i].localName == "xmlns") {
            prefix = "";
          }
          if (!(prefix in prefixMap)) {
            prefixMap[prefix] = e.attributes[i].nodeValue;
          }
        }
      }
      e = e.parentNode;
    }
    return prefixMap;
  };
  
  class GraphRDFaProcessor extends RDFaProcessor$1 {
    constructor(target) {
      super(target);
    }
    getObjectSize(obj) {
      var size = 0;
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          size++;
        }
      }
      return size;
    }
    init() {
      var thisObj = this;
      this.finishedHandlers.push(function (node) {
        for (var subject in thisObj.target.graph.subjects) {
          var snode = thisObj.target.graph.subjects[subject];
          if (thisObj.getObjectSize(snode.predicates) == 0) {
            delete thisObj.target.graph.subjects[subject];
          }
        }
      });
    }
    newBlankNode() {
      return this.target.graph.newBlankNode();
    }
    newSubjectOrigin(origin, subject) {
      var snode = this.newSubject(null, subject);
      for (var i = 0; i < snode.origins.length; i++) {
        if (snode.origins[i] === origin) {
          return;
        }
      }
      snode.origins.push(origin);
      if (!origin.data) {
        Object.defineProperty(origin, "data", {
          value: snode,
          writable: false,
          configurable: true,
          enumerable: true
        });
      }
    }
    newSubject(origin, subject) {
      var snode = this.target.graph.subjects[subject];
      if (!snode) {
        snode = new RDFaSubject(this.target.graph, subject);
        this.target.graph.subjects[subject] = snode;
      }
      return snode;
    }
    addTriple(origin, subject, predicate, object) {
      var snode = this.newSubject(origin, subject);
      var pnode = snode.predicates[predicate];
      if (!pnode) {
        pnode = new RDFaPredicate(predicate);
        snode.predicates[predicate] = pnode;
      }
      for (var i = 0; i < pnode.objects.length; i++) {
        if (pnode.objects[i].type == object.type && pnode.objects[i].value == object.value) {
          if (pnode.objects[i].origin !== origin) {
            if (!Array.isArray(pnode.objects[i].origin)) {
              var origins = [];
              origins.push(pnode.objects[i].origin);
              pnode.objects[i].origin = origins;
            }
            pnode.objects[i].origin.push(origin);
          }
          return;
        }
      }
      pnode.objects.push(object);
      object.origin = origin;
      if (predicate == RDFaProcessor$1.typeURI) {
        snode.types.push(object.value);
      }
    }
    copyProperties() {
      var copySubjects = [];
      var patternSubjects = {};
      for (var subject in this.target.graph.subjects) {
        var snode = this.target.graph.subjects[subject];
        var pnode = snode.predicates[GraphRDFaProcessor.rdfaCopyPredicate];
        if (!pnode) {
          continue;
        }
        copySubjects.push(subject);
        for (var i = 0; i < pnode.objects.length; i++) {
          if (pnode.objects[i].type != RDFaProcessor$1.objectURI) {
            continue;
          }
          var target = pnode.objects[i].value;
          var patternSubjectNode = this.target.graph.subjects[target];
          if (!patternSubjectNode) {
            continue;
          }
          var patternTypes = patternSubjectNode.predicates[RDFaProcessor$1.typeURI];
          if (!patternTypes) {
            continue;
          }
          var isPattern = false;
          for (var j = 0; j < patternTypes.objects.length && !isPattern; j++) {
            if (patternTypes.objects[j].value == GraphRDFaProcessor.rdfaPatternType && patternTypes.objects[j].type == RDFaProcessor$1.objectURI) {
              isPattern = true;
            }
          }
          if (!isPattern) {
            continue;
          }
          patternSubjects[target] = true;
          for (var predicate in patternSubjectNode.predicates) {
            var targetPNode = patternSubjectNode.predicates[predicate];
            if (predicate == RDFaProcessor$1.typeURI) {
              if (targetPNode.objects.length == 1) {
                continue;
              }
              for (var j = 0; j < targetPNode.objects.length; j++) {
                if (targetPNode.objects[j].value != GraphRDFaProcessor.rdfaPatternType) {
                  var subjectPNode = snode.predicates[predicate];
                  if (!subjectPNode) {
                    subjectPNode = new RDFaPredicate(predicate);
                    snode.predicates[predicate] = subjectPNode;
                  }
                  subjectPNode.objects.push({
                    type: targetPNode.objects[j].type,
                    value: targetPNode.objects[j].value,
                    language: targetPNode.objects[j].language,
                    origin: targetPNode.objects[j].origin
                  });
                  snode.types.push(targetPNode.objects[j].value);
                }
              }
            } else {
              var subjectPNode = snode.predicates[predicate];
              if (!subjectPNode) {
                subjectPNode = new RDFaPredicate(predicate);
                snode.predicates[predicate] = subjectPNode;
              }
              for (var j = 0; j < targetPNode.objects.length; j++) {
                subjectPNode.objects.push({
                  type: targetPNode.objects[j].type,
                  value: targetPNode.objects[j].value,
                  language: targetPNode.objects[j].language,
                  origin: targetPNode.objects[j].origin
                });
              }
            }
          }
        }
      }
      for (var i = 0; i < copySubjects.length; i++) {
        var snode = this.target.graph.subjects[copySubjects[i]];
        delete snode.predicates[GraphRDFaProcessor.rdfaCopyPredicate];
      }
      for (var subject in patternSubjects) {
        delete this.target.graph.subjects[subject];
      }
    }
  }
  GraphRDFaProcessor.rdfaCopyPredicate = "http://www.w3.org/ns/rdfa#copy";
  GraphRDFaProcessor.rdfaPatternType = "http://www.w3.org/ns/rdfa#Pattern";
  
  function getRDFaGraph (document, options = {}) {
    let node = document.documentElement || document;
    let baseURI = options.baseURI ? options.baseURI : node.baseURI;
    let graph = new RDFaGraph();
    let target = {
      graph,
      baseURI: new URIResolver().parseURI(baseURI)
    };
    var processor = new GraphRDFaProcessor(target);
    processor.process(node, options);
    return target.graph;
  }
  
  function parseHTML(htmlString, sourceUrl) {
    let parseResult = new DOMParser().parseFromString(htmlString, "text/html");
    if (sourceUrl) {
      let baseEl = document.createElement("base");
      baseEl.href = sourceUrl;
      parseResult.head.append(baseEl);
    }
    return {
      window: {
        document: parseResult
      }
    };
  }
  async function fetchUrl(url) {
    let res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Network error requesting ${url} : ${res.status} ${res.statusText}`);
    }
    let contentType = res.headers.get("Content-Type");
    if (!contentType.startsWith("text/html")) {
      throw new Error(`Received document with type ${contentType} from ${url} expected text/html`);
    }
    return parseHTML(await res.text(), url);
  }
  function JSDOM(htmlString) {
    return parseHTML(htmlString);
  }
  JSDOM.fromURL = fetchUrl;
  JSDOM.fromFile = fetchUrl;
  
  const XMLSerializer$1 = window.XMLSerializer;
  
  function getDefaultExportFromCjs (x) {
      return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }
  
  /**
   * Expose `isUrl`.
   */
  
  var isUrl_1 = isUrl;
  
  /**
   * RegExps.
   * A URL must match #1 and then at least one of #2/#3.
   * Use two levels of REs to avoid REDOS.
   */
  
  var protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;
  var localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
  var nonLocalhostDomainRE = /^[^\s\.]+\.\S{2,}$/;
  
  /**
   * Loosely validate a URL `string`.
   *
   * @param {String} string
   * @return {Boolean}
   */
  
  function isUrl(string) {
    if (typeof string !== 'string') {
      return false;
    }
    var match = string.match(protocolAndDomainRE);
    if (!match) {
      return false;
    }
    var everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) {
      return false;
    }
    if (localhostDomainRE.test(everythingAfterProtocol) || nonLocalhostDomainRE.test(everythingAfterProtocol)) {
      return true;
    }
    return false;
  }
  var isUrl$1 = /*@__PURE__*/getDefaultExportFromCjs(isUrl_1);
  
  class BlankNode {
    constructor(id) {
      this.value = id;
    }
    equals(other) {
      return !!other && other.termType === this.termType && other.value === this.value;
    }
  }
  BlankNode.prototype.termType = 'BlankNode';
  
  class DefaultGraph {
    equals(other) {
      return !!other && other.termType === this.termType;
    }
  }
  DefaultGraph.prototype.termType = 'DefaultGraph';
  DefaultGraph.prototype.value = '';
  
  function fromTerm(factory, original) {
    if (!original) {
      return null;
    }
    if (original.termType === 'BlankNode') {
      return factory.blankNode(original.value);
    }
    if (original.termType === 'DefaultGraph') {
      return factory.defaultGraph();
    }
    if (original.termType === 'Literal') {
      return factory.literal(original.value, original.language || factory.namedNode(original.datatype.value));
    }
    if (original.termType === 'NamedNode') {
      return factory.namedNode(original.value);
    }
    if (original.termType === 'Quad') {
      const subject = factory.fromTerm(original.subject);
      const predicate = factory.fromTerm(original.predicate);
      const object = factory.fromTerm(original.object);
      const graph = factory.fromTerm(original.graph);
      return factory.quad(subject, predicate, object, graph);
    }
    if (original.termType === 'Variable') {
      return factory.variable(original.value);
    }
    throw new Error(`unknown termType ${original.termType}`);
  }
  
  class Literal {
    constructor(value, language, datatype) {
      this.value = value;
      this.language = language;
      this.datatype = datatype;
    }
    equals(other) {
      return !!other && other.termType === this.termType && other.value === this.value && other.language === this.language && other.datatype.equals(this.datatype);
    }
  }
  Literal.prototype.termType = 'Literal';
  
  class NamedNode {
    constructor(iri) {
      this.value = iri;
    }
    equals(other) {
      return !!other && other.termType === this.termType && other.value === this.value;
    }
  }
  NamedNode.prototype.termType = 'NamedNode';
  
  class Quad {
    constructor(subject, predicate, object, graph) {
      this.subject = subject;
      this.predicate = predicate;
      this.object = object;
      this.graph = graph;
    }
    equals(other) {
      // `|| !other.termType` is for backwards-compatibility with old factories without RDF* support.
      return !!other && (other.termType === 'Quad' || !other.termType) && other.subject.equals(this.subject) && other.predicate.equals(this.predicate) && other.object.equals(this.object) && other.graph.equals(this.graph);
    }
  }
  Quad.prototype.termType = 'Quad';
  Quad.prototype.value = '';
  
  class Variable {
    constructor(name) {
      this.value = name;
    }
    equals(other) {
      return !!other && other.termType === this.termType && other.value === this.value;
    }
  }
  Variable.prototype.termType = 'Variable';
  
  const langStringDatatype = new NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString');
  const stringDatatype = new NamedNode('http://www.w3.org/2001/XMLSchema#string');
  class DataFactory {
    constructor() {
      this.init();
    }
    init() {
      this._data = {
        blankNodeCounter: 0,
        defaultGraph: new DefaultGraph()
      };
    }
    namedNode(value) {
      return new NamedNode(value);
    }
    blankNode(value) {
      value = value || 'b' + ++this._data.blankNodeCounter;
      return new BlankNode(value);
    }
    literal(value, languageOrDatatype) {
      if (typeof languageOrDatatype === 'string') {
        return new Literal(value, languageOrDatatype, langStringDatatype);
      } else {
        return new Literal(value, '', languageOrDatatype || stringDatatype);
      }
    }
    variable(value) {
      return new Variable(value);
    }
    defaultGraph() {
      return this._data.defaultGraph;
    }
    quad(subject, predicate, object, graph = this.defaultGraph()) {
      return new Quad(subject, predicate, object, graph);
    }
    fromTerm(original) {
      return fromTerm(this, original);
    }
    fromQuad(original) {
      return fromTerm(this, original);
    }
  }
  DataFactory.exports = ['blankNode', 'defaultGraph', 'fromQuad', 'fromTerm', 'literal', 'namedNode', 'quad', 'variable'];
  
  const factory$1 = new DataFactory();
  
  function isString(s) {
    return typeof s === 'string' || s instanceof String;
  }
  const xsdString = 'http://www.w3.org/2001/XMLSchema#string';
  function termToId(term) {
    if (typeof term === 'string') {
      return term;
    }
    if (!term) {
      return '';
    }
    if (typeof term.id !== 'undefined' && term.termType !== 'Quad') {
      return term.id;
    }
    let subject, predicate, object, graph;
  
    // Term instantiated with another library
    switch (term.termType) {
      case 'NamedNode':
        return term.value;
      case 'BlankNode':
        return `_:${term.value}`;
      case 'Variable':
        return `?${term.value}`;
      case 'DefaultGraph':
        return '';
      case 'Literal':
        if (term.language) {
          return `"${term.value}"@${term.language}`;
        }
        return `"${term.value}"${term.datatype && term.datatype.value !== xsdString ? `^^${term.datatype.value}` : ''}`;
      case 'Quad':
        // To identify RDF* quad components, we escape quotes by doubling them.
        // This avoids the overhead of backslash parsing of Turtle-like syntaxes.
        subject = escapeQuotes(termToId(term.subject));
        predicate = escapeQuotes(termToId(term.predicate));
        object = escapeQuotes(termToId(term.object));
        graph = term.graph.termType === 'DefaultGraph' ? '' : ` ${termToId(term.graph)}`;
        return `<<${subject} ${predicate} ${object}${graph}>>`;
      default:
        throw new Error(`Unexpected termType: ${term.termType}`);
    }
  }
  const escapedLiteral = /^"(.*".*)(?="[^"]*$)/;
  function escapeQuotes(id) {
    return id.replace(escapedLiteral, (_, quoted) => `"${quoted.replace(/"/g, '""')}`);
  }
  class DatasetCore {
    constructor(quads) {
      // The number of quads is initially zero
      this._size = 0;
      // `_graphs` contains subject, predicate, and object indexes per graph
      this._graphs = Object.create(null);
      // `_ids` maps entities such as `http://xmlns.com/foaf/0.1/name` to numbers,
      // saving memory by using only numbers as keys in `_graphs`
      this._id = 0;
      this._ids = Object.create(null);
      this._ids['><'] = 0; // dummy entry, so the first actual key is non-zero
      this._entities = Object.create(null); // inverse of `_ids`
  
      this._quads = new Map();
  
      // Add quads if passed
      if (quads) {
        for (const quad of quads) {
          this.add(quad);
        }
      }
    }
    get size() {
      // Return the quad count if if was cached
      let size = this._size;
      if (size !== null) {
        return size;
      }
  
      // Calculate the number of quads by counting to the deepest level
      size = 0;
      const graphs = this._graphs;
      let subjects, subject;
      for (const graphKey in graphs) {
        for (const subjectKey in subjects = graphs[graphKey].subjects) {
          for (const predicateKey in subject = subjects[subjectKey]) {
            size += Object.keys(subject[predicateKey]).length;
          }
        }
      }
      this._size = size;
      return this._size;
    }
    add(quad) {
      // Convert terms to internal string representation
      let subject = termToId(quad.subject);
      let predicate = termToId(quad.predicate);
      let object = termToId(quad.object);
      const graph = termToId(quad.graph);
  
      // Find the graph that will contain the triple
      let graphItem = this._graphs[graph];
      // Create the graph if it doesn't exist yet
      if (!graphItem) {
        graphItem = this._graphs[graph] = {
          subjects: {},
          predicates: {},
          objects: {}
        };
        // Freezing a graph helps subsequent `add` performance,
        // and properties will never be modified anyway
        Object.freeze(graphItem);
      }
  
      // Since entities can often be long IRIs, we avoid storing them in every index.
      // Instead, we have a separate index that maps entities to numbers,
      // which are then used as keys in the other indexes.
      const ids = this._ids;
      const entities = this._entities;
      subject = ids[subject] || (ids[entities[++this._id] = subject] = this._id);
      predicate = ids[predicate] || (ids[entities[++this._id] = predicate] = this._id);
      object = ids[object] || (ids[entities[++this._id] = object] = this._id);
      this._addToIndex(graphItem.subjects, subject, predicate, object);
      this._addToIndex(graphItem.predicates, predicate, object, subject);
      this._addToIndex(graphItem.objects, object, subject, predicate);
      this._setQuad(subject, predicate, object, graph, quad);
  
      // The cached quad count is now invalid
      this._size = null;
      return this;
    }
    delete(quad) {
      // Convert terms to internal string representation
      let subject = termToId(quad.subject);
      let predicate = termToId(quad.predicate);
      let object = termToId(quad.object);
      const graph = termToId(quad.graph);
  
      // Find internal identifiers for all components
      // and verify the quad exists.
      const ids = this._ids;
      const graphs = this._graphs;
      let graphItem, subjects, predicates;
      if (!(subject = ids[subject]) || !(predicate = ids[predicate]) || !(object = ids[object]) || !(graphItem = graphs[graph]) || !(subjects = graphItem.subjects[subject]) || !(predicates = subjects[predicate]) || !(object in predicates)) {
        return this;
      }
  
      // Remove it from all indexes
      this._removeFromIndex(graphItem.subjects, subject, predicate, object);
      this._removeFromIndex(graphItem.predicates, predicate, object, subject);
      this._removeFromIndex(graphItem.objects, object, subject, predicate);
      if (this._size !== null) {
        this._size--;
      }
      this._deleteQuad(subject, predicate, object, graph);
  
      // Remove the graph if it is empty
      for (subject in graphItem.subjects) {
        // eslint-disable-line no-unreachable-loop
        return this;
      }
      delete graphs[graph];
      return this;
    }
    has(quad) {
      // Convert terms to internal string representation
      const subject = termToId(quad.subject);
      const predicate = termToId(quad.predicate);
      const object = termToId(quad.object);
      const graph = termToId(quad.graph);
      const graphItem = this._graphs[graph];
      if (!graphItem) {
        return false;
      }
      const ids = this._ids;
      let subjectId, predicateId, objectId;
  
      // Translate IRIs to internal index keys.
      if (isString(subject) && !(subjectId = ids[subject]) || isString(predicate) && !(predicateId = ids[predicate]) || isString(object) && !(objectId = ids[object])) {
        return false;
      }
      return this._countInIndex(graphItem.objects, objectId, subjectId, predicateId) === 1;
    }
    match(subject, predicate, object, graph) {
      return this._createDataset(this._match(subject, predicate, object, graph));
    }
    [Symbol.iterator]() {
      return this._match()[Symbol.iterator]();
    }
  
    // ## Private methods
  
    // ### `_addToIndex` adds a quad to a three-layered index.
    // Returns if the index has changed, if the entry did not already exist.
    _addToIndex(index0, key0, key1, key2) {
      // Create layers as necessary
      const index1 = index0[key0] || (index0[key0] = {});
      const index2 = index1[key1] || (index1[key1] = {});
      // Setting the key to _any_ value signals the presence of the quad
      const existed = (key2 in index2);
      if (!existed) {
        index2[key2] = null;
      }
      return !existed;
    }
  
    // ### `_removeFromIndex` removes a quad from a three-layered index
    _removeFromIndex(index0, key0, key1, key2) {
      // Remove the quad from the index
      const index1 = index0[key0];
      const index2 = index1[key1];
      delete index2[key2];
  
      // Remove intermediary index layers if they are empty
      for (const key in index2) {
        // eslint-disable-line no-unreachable-loop
        return;
      }
      delete index1[key1];
      for (const key in index1) {
        // eslint-disable-line no-unreachable-loop
        return;
      }
      delete index0[key0];
    }
  
    // ### `_findInIndex` finds a set of quads in a three-layered index.
    // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
    // Any of these keys can be undefined, which is interpreted as a wildcard.
    // `name0`, `name1`, and `name2` are the names of the keys at each level,
    // used when reconstructing the resulting quad
    // (for instance: _subject_, _predicate_, and _object_).
    // Finally, `graph` will be the graph of the created quads.
    // If `callback` is given, each result is passed through it
    // and iteration halts when it returns truthy for any quad.
    // If instead `array` is given, each result is added to the array.
    _findInIndex(index0, key0, key1, key2, name0, name1, name2, graph, callback, array) {
      let tmp, index1, index2;
  
      // If a key is specified, use only that part of index 0.
      if (key0) {
        (tmp = index0, index0 = {})[key0] = tmp[key0];
      }
      for (const value0 in index0) {
        index1 = index0[value0];
        if (index1) {
          // If a key is specified, use only that part of index 1.
          if (key1) {
            (tmp = index1, index1 = {})[key1] = tmp[key1];
          }
          for (const value1 in index1) {
            index2 = index1[value1];
            if (index2) {
              // If a key is specified, use only that part of index 2, if it exists.
              const values = key2 ? key2 in index2 ? [key2] : [] : Object.keys(index2);
              // Create quads for all items found in index 2.
              for (let l = 0; l < values.length; l++) {
                const parts = {
                  [name0]: value0,
                  [name1]: value1,
                  [name2]: values[l]
                };
                const quad = this._getQuad(parts.subject, parts.predicate, parts.object, graph);
                if (array) {
                  array.push(quad);
                } else if (callback(quad)) {
                  return true;
                }
              }
            }
          }
        }
      }
      return array;
    }
  
    // ### `_countInIndex` counts matching quads in a three-layered index.
    // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
    // Any of these keys can be undefined, which is interpreted as a wildcard.
    _countInIndex(index0, key0, key1, key2) {
      let count = 0;
      let tmp, index1, index2;
  
      // If a key is specified, count only that part of index 0
      if (key0) {
        (tmp = index0, index0 = {})[key0] = tmp[key0];
      }
      for (const value0 in index0) {
        index1 = index0[value0];
        if (index1) {
          // If a key is specified, count only that part of index 1
          if (key1) {
            (tmp = index1, index1 = {})[key1] = tmp[key1];
          }
          for (const value1 in index1) {
            index2 = index1[value1];
            if (index2) {
              if (key2) {
                // If a key is specified, count the quad if it exists
                key2 in index2 && count++;
              } else {
                // Otherwise, count all quads
                count += Object.keys(index2).length;
              }
            }
          }
        }
      }
      return count;
    }
  
    // ### `_getGraphs` returns an array with the given graph,
    // or all graphs if the argument is null or undefined.
    _getGraphs(graph) {
      if (!isString(graph)) {
        return this._graphs;
      }
      return {
        [graph]: this._graphs[graph]
      };
    }
    _match(subject, predicate, object, graph) {
      // Convert terms to internal string representation
      subject = subject && termToId(subject);
      predicate = predicate && termToId(predicate);
      object = object && termToId(object);
      graph = graph && termToId(graph);
      const quads = [];
      const graphs = this._getGraphs(graph);
      const ids = this._ids;
      let content, subjectId, predicateId, objectId;
  
      // Translate IRIs to internal index keys.
      if (isString(subject) && !(subjectId = ids[subject]) || isString(predicate) && !(predicateId = ids[predicate]) || isString(object) && !(objectId = ids[object])) {
        return quads;
      }
      for (const graphId in graphs) {
        content = graphs[graphId];
  
        // Only if the specified graph contains triples, there can be results
        if (content) {
          // Choose the optimal index, based on what fields are present
          if (subjectId) {
            if (objectId) {
              // If subject and object are given, the object index will be the fastest
              this._findInIndex(content.objects, objectId, subjectId, predicateId, 'object', 'subject', 'predicate', graphId, null, quads);
            } else {
              // If only subject and possibly predicate are given, the subject index will be the fastest
              this._findInIndex(content.subjects, subjectId, predicateId, null, 'subject', 'predicate', 'object', graphId, null, quads);
            }
          } else if (predicateId) {
            // if only predicate and possibly object are given, the predicate index will be the fastest
            this._findInIndex(content.predicates, predicateId, objectId, null, 'predicate', 'object', 'subject', graphId, null, quads);
          } else if (objectId) {
            // If only object is given, the object index will be the fastest
            this._findInIndex(content.objects, objectId, null, null, 'object', 'subject', 'predicate', graphId, null, quads);
          } else {
            // If nothing is given, iterate subjects and predicates first
            this._findInIndex(content.subjects, null, null, null, 'subject', 'predicate', 'object', graphId, null, quads);
          }
        }
      }
      return quads;
    }
    _getQuad(subjectId, predicateId, objectId, graphId) {
      return this._quads.get(this._toId(subjectId, predicateId, objectId, graphId));
    }
    _setQuad(subjectId, predicateId, objectId, graphId, quad) {
      this._quads.set(this._toId(subjectId, predicateId, objectId, graphId), quad);
    }
    _deleteQuad(subjectId, predicateId, objectId, graphId) {
      this._quads.delete(this._toId(subjectId, predicateId, objectId, graphId));
    }
    _createDataset(quads) {
      return new this.constructor(quads);
    }
    _toId(subjectId, predicateId, objectId, graphId) {
      return `${subjectId}:${predicateId}:${objectId}:${graphId}`;
    }
  }
  
  class Factory {
    dataset(quads) {
      return new DatasetCore(quads);
    }
  }
  Factory.exports = ['dataset'];
  
  const factory = new Factory();
  
  const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  const RDF_XML_LITERAL = RDF + 'XMLLiteral';
  const RDF_HTML_LITERAL = RDF + 'HTML';
  const RDF_OBJECT = RDF + 'object';
  const RDF_PLAIN_LITERAL = RDF + 'PlainLiteral';
  const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
  
  /**
   * @param data - a filePath, HTML string or URL
   */
  
  async function jsonldRdfaParser(data) {
    function process(node) {
      let opts;
      if (!node.baseURI || node.baseURI === 'about:blank') {
        opts = {
          baseURI: 'http://localhost/'
        };
      }
      let dataset;
      try {
        let graph = getRDFaGraph(node, opts);
        dataset = processGraph(graph);
      } catch (e) {
        throw e;
      }
      return dataset;
    }
    if (typeof data === 'object' && 'nodeType' in data) {
      return process(data);
    } else if (typeof data === 'string') {
      if (isUrl$1(data)) {
        let dom = await JSDOM.fromURL(data);
        return process(dom.window.document);
      } else if (/<[a-z][\s\S]*>/i.test(data)) {
        return process(new JSDOM(data).window.document);
      } else {
        let dom = await JSDOM.fromFile(data);
        return process(dom.window.document);
      }
    } else {
      throw new Error('data must be a file path, HTML string, URL or a DOM element');
    }
  }
  
  /**
   * This function is mostly taken from the jsonld.js lib but updated to
   * the latest green-turtle API, and for support for HTML
   */
  function processGraph(data) {
    let quads = [];
    let subjects = data.subjects,
      htmlMapper = n => {
        let div = n.ownerDocument.createElement('div');
        div.appendChild(n.cloneNode(true));
        return div.innerHTML;
      };
    Object.keys(subjects).forEach(subject => {
      let predicates = subjects[subject].predicates;
      Object.keys(predicates).forEach(predicate => {
        // iterate over objects
        let objects = predicates[predicate].objects;
        for (let oi = 0; oi < objects.length; ++oi) {
          let object = objects[oi];
  
          // create RDF triple
          let triple = {};
  
          // add subject & predicate
          if (subject.indexOf('_:')) {
            triple.subject = factory$1.blankNode(subject);
          } else {
            triple.subject = factory$1.namedNode(subject);
          }
          if (predicate.indexOf('_:')) {
            triple.predicate = factory$1.blankNode(predicate);
          } else {
            triple.predicate = factory$1.namedNode(predicate);
          }
          triple.object = null;
  
          // serialize XML literal
          let value = object.value;
          // !!! TODO: !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
          // The below actually most likely does NOT work.
          // In most usage contexts this will be an HTML DOM, passing it to xmldom's XMLSerializer
          // will cause it to call .toString() on all the nodes it finds — this only works inside
          // xmldom.
          if (object.type === RDF_XML_LITERAL) {
            // initialize XMLSerializer
            let serializer = new XMLSerializer$1();
            value = Array.from(object.value).map(n => serializer.serializeToString(n)).join('');
            triple.object = factory$1.literal(value, factory$1.namedNode(RDF_XML_LITERAL));
          }
          // serialise HTML literal
          else if (object.type === RDF_HTML_LITERAL) {
            value = Array.from(object.value).map(htmlMapper).join('');
            triple.object = factory$1.literal(value, factory$1.namedNode(RDF_HTML_LITERAL));
          }
          // object is an IRI
          else if (object.type === RDF_OBJECT) {
            if (object.value.indexOf('_:') === 0) {
              triple.object = factory$1.blankNode(value);
            } else {
              triple.object = factory$1.namedNode(value);
            }
          } else {
            // object is a literal
            if (object.type === RDF_PLAIN_LITERAL) {
              if (object.language) {
                triple.object = factory$1.literal(value, object.language);
              } else {
                triple.object = factory$1.literal(value, factory$1.namedNode(XSD_STRING));
              }
            } else {
              triple.object = factory$1.literal(value, factory$1.namedNode(object.type));
            }
          }
  
          // add triple to dataset in default graph
          quads.push(factory$1.quad(triple.subject, triple.predicate, triple.object, factory$1.defaultGraph()));
        }
      });
    });
    return factory.dataset(quads);
  }
  
  export { jsonldRdfaParser as default };