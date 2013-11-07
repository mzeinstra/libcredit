// -*- coding: utf-8 -*-

(function (libcredit) {

    //
    // Helper functions
    //

    // Test credit by calling func to perform the checks on the credit
    // object
    
    var testCredit = function(filename, sourceURI, func) {
	it('credit for ' + filename, function() {
	    var turtle, out, kb, credit, formatter;

	    turtle = fs.readFileSync('../testcases/' + filename + '.ttl', 'utf-8');
	    
	    kb = new $rdf.IndexedFormula();

	    // A bug in rdflib means that we must pass in a base URI,
	    // '' triggers an error
	    $rdf.parse(turtle, kb, 'urn:base', 'text/turtle');

	    // So because of that bug, we have to specify the source URI
	    credit = libcredit.credit(kb, sourceURI);
	    func(credit);
	});
    };

    // Helper formatter to generate the test output string
    var testCreditFormatter = function() {
	var that = libcredit.creditFormatter();

	var sourceStack = [];
	var sourceDepth = 0;

	var add_line = function(type, text, url) {
	    var prefix = '';
	    
	    if (sourceStack.length) {
		prefix = '<' + sourceStack.join('> <') + '> ';
	    }
	    
	    that.output.push(prefix + type + ' "' +
			     (text ? text : '') + '" <' +
			     (url ? url : '') + '>');
	};


	that.begin = function() {
	    if (sourceDepth === 0) {
		// At top
		that.output = [];
	    }

	    sourceDepth++;
	};
	
	that.end = function() {
	    if (sourceDepth > 1) {
		sourceStack.pop();
	    }
	    
	    sourceDepth--;
	};

	that.addTitle = function(text, url) {
	    if (sourceDepth > 1) {
		sourceStack.push(url);
	    }
	    
	    add_line('title', text, url);
	};

	that.addAttrib = function(text, url) {
	    add_line('attrib', text, url);
	};

	that.addLicense = function(text, url) {
	    add_line('license', text, url);
	};

	return that;
    };

    // Test credit by comparing the generated credit with the expected output
    var testCreditOutput = function(filename, sourceURI) {
	var out = fs.readFileSync('../testcases/' + filename + '.out', 'utf-8');
	var expected = out.split('\n');
	var f = testCreditFormatter();

	testCredit(filename, sourceURI, function(credit) {
	    var a, e;
	    var actual;
	    
	    expect( credit ).to.not.be( null );

	    credit.format(f, 10); // we want some more sources
	    expect( f.output ).to.be.an( 'array' );

	    actual = f.output;
	    actual.sort();
	    expected.sort();

	    for (a = e = 0; a < actual.length && e < expected.length; ) {
		// Ignore empty lines in expected to simplify things
		if (!expected[e]) {
		    e++;
		}
		else {
		    expect( actual[a] ).to.be( expected[e] );
		    a++; e++;
		}
	    }

	    if (a < actual.length) {
		// Bug in expect.js means we need to pass a function, not just the string
		expect().fail(function() { return 'unexpected output: ' + actual[a]; });
	    }

	    // Strip trailing empty expected lines
	    while (e < expected.length && !expected[e]) {
		e++;
	    }

	    if (e < expected.length) {
		expect().fail(function() { return 'missing expected output: ' + expected[e]; });
	    }
	});
    };


    //
    // Test cases
    //

    describe("Property Checks", function () {
	it("should exist", function () {
	    expect( libcredit ).to.be.ok();
	});
	
	it("should have public functions", function () {
	    expect( libcredit.credit ).to.be.a('function');
	    expect( libcredit.creditFormatter ).to.be.a('function');
	    expect( libcredit.textCreditFormatter ).to.be.a('function');
	    expect( libcredit.htmlCreditFormatter ).to.be.a('function');
	});
    });

    describe('License names', function () {
	expect( libcredit.getLicenseName(
	    'http://creativecommons.org/licenses/by-sa/3.0/') ).to.be(
		'CC-BY-SA 3.0 Unported'
	    );
		
	expect( libcredit.getLicenseName(
	    'http://creativecommons.org/licenses/by-nc/2.5/deed.en') ).to.be(
		'CC-BY-NC 2.5 Unported'
	    );
		
	expect( libcredit.getLicenseName(
	    'http://creativecommons.org/licenses/by/3.0/au/deed.en_US') ).to.be(
		'CC-BY 3.0 (AU)'
	    );
    });		
	
    describe('Pure Dublin Core', function () {
	// By using urn:src we avoid getting a title from the source
	// URI
	testCredit('nothing', 'urn:src', function (credit) {
	    expect( credit ).to.be( null );
	});

	testCreditOutput('dc-title-text', 'urn:src');
	testCreditOutput('dc-title-url', 'http://test/');
	testCreditOutput('dc-creator-text', 'urn:src');
	testCreditOutput('dc-creator-url', 'urn:src');
	testCreditOutput('dc-rights', 'urn:src');
    });

    describe('ccREL', function () {
	testCreditOutput('cc-attrib-name', 'urn:src');
	testCreditOutput('cc-attrib-url', 'urn:src');
	testCreditOutput('cc-attrib-both', 'urn:src');
	testCreditOutput('cc-license', 'urn:src');
	testCreditOutput('cc-full-attrib', 'http://src/');
    });

    describe('License text', function () {
	testCreditOutput('xhtml-license-text', 'urn:src');
    });

    describe('Open Graph', function () {
	testCreditOutput('og-title', 'urn:src');
	testCreditOutput('og-url', 'http://src/');
    });

    describe('Twitter', function () {
	testCreditOutput('twitter-creator', 'urn:src');
    });

    describe('Sources', function () {
	testCreditOutput('sources-uris', 'http://src/');
	testCreditOutput('sources-with-sources', 'http://src/');
	testCreditOutput('source-with-full-attrib', 'http://src/');
    });

    describe('Text formatter', function() {
	testCredit('source-with-full-attrib', 'http://src/', function (credit) {
	    var tf = libcredit.textCreditFormatter();
	    credit.format(tf);

	    expect( tf.getText() ).to.be(
		'a title by name of attribution (CC-BY-SA 3.0 Unported). Source:\n' +
		    '    * subsrc title by subsrc attribution (CC-BY-NC-ND 3.0 Unported).'
	    );
	});
    });

    describe('i18n', function() {
	var i18n, raw, data;

	// We're in a unit test, so let's just use the eval() function
	// to get the locale json.  Don't do this in live code!

	raw = fs.readFileSync('locales/sv.json', 'utf-8');
	data = eval('(' + raw + ')');
	i18n = new jed.Jed({
	    domain: 'libcredit',
	    locale_data: {
		libcredit: data
	    }});

	// Singular form
	testCredit('source-with-full-attrib', 'http://src/', function (credit) {
	    var tf = libcredit.textCreditFormatter();
	    credit.format(tf, 10, i18n);

	    expect( tf.getText() ).to.be(
		'a title av name of attribution (CC-BY-SA 3.0 Unported). Källa:\n' +
		    '    * subsrc title av subsrc attribution (CC-BY-NC-ND 3.0 Unported).'
	    );
	});


	// Plural forms
	testCredit('sources-uris', 'http://src/', function (credit) {
	    var tf = libcredit.textCreditFormatter();
	    credit.format(tf, 10, i18n);

	    expect( tf.getText() ).to.be(
		'main title. Källor:\n' +
		    '    * http://subsrc-1/.\n' + 
		    '    * http://subsrc-2/.'
	    );
	});
    });
})(libcredit);
