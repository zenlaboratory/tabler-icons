const gulp = require('gulp'),
	cp = require('child_process'),
	glob = require('glob'),
	fs = require('fs'),
	path = require('path'),
	p = require('./package.json'),
	zip = require('gulp-zip'),
	puppeteer = require('puppeteer');

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

const svgToPng = async (filePath, destination) => {
	filePath = path.join(__dirname, filePath);

	const htmlFilePath = path.join("file:", filePath);
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.setViewport({
		height: 24,
		width: 24,
		deviceScaleFactor: 10
	});

	await page.goto(htmlFilePath);

	await page.screenshot({
		path: path.join(__dirname, destination),
		omitBackground: true,
		fullPage: true
	});

	await browser.close();

	return page;
};

const createScreenshot = async (filePath) => {
	try {
		filePath = path.join(__dirname, filePath);

		const fileName = filePath.replace('.svg', '');
		const htmlFilePath = path.join("file:", filePath);
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		
		await page.setViewport({
			height: 100,
			width: 100
		});

		await page.goto(htmlFilePath);

		await page.screenshot({
			path: `${fileName}.png`,
			omitBackground: false,
			fullPage: true
		});

		await browser.close();
	} catch (error) {
		console.error(error);
		throw Error(error);
	}
};

gulp.task('icons-sprite', function (cb) {
	glob("_site/icons/*.svg", {}, function (er, files) {

		let svgContent = '';

		files.forEach(function (file, i) {
			let name = path.basename(file, '.svg'),
				svgFile = fs.readFileSync(file),
				svgFileContent = svgFile.toString();

			svgFileContent = svgFileContent
				.replace(/<svg[^>]+>/g, '')
				.replace(/<\/svg>/g, '')
				.replace(/\n+/g, '')
				.replace(/>\s+</g, '><')
				.trim();

			svgContent += `<symbol id="tabler-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgFileContent}</symbol>`
		});

		let svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${svgContent}</defs></svg>`;

		fs.writeFileSync('tabler-sprite.svg', svg);
		fs.writeFileSync('tabler-sprite-nostroke.svg', svg.replace(/stroke-width="2"\s/g, ''));
		cb();
	});
});

gulp.task('icons-preview', function (cb) {
	const columnsCount = 17,
		padding = 29,
		paddingOuter = 5,
		iconSize = 24;

	glob("_site/icons/*.svg", {}, function (er, files) {
		const iconsCount = files.length,
			rowsCount = Math.ceil(iconsCount / columnsCount),
			width = columnsCount * (iconSize + padding) + 2 * paddingOuter - padding,
			height = rowsCount * (iconSize + padding) + 2 * paddingOuter - padding;

		let svgContentSymbols = '',
			svgContentIcons = '',
			x = paddingOuter,
			y = paddingOuter;
		files.forEach(function (file, i) {
			let name = path.basename(file, '.svg');

			let svgFile = fs.readFileSync(file),
				svgFileContent = svgFile.toString();

			svgFileContent = svgFileContent
				.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<symbol id="${name}"`)
				.replace(' width="24" height="24"', '')
				.replace('</svg>', '</symbol>')
				.replace(/\n\s+/g, '');

			svgContentSymbols += `\t${svgFileContent}\n`;
			svgContentIcons += `\t<use xlink:href="#${name}" x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" />\n`;

			x += padding + iconSize;

			if (i % columnsCount === columnsCount - 1) {
				x = paddingOuter;
				y += padding + iconSize;
			}
		});

		const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="color: #354052"><rect x="0" y="0" width="${width}" height="${height}" fill="#fff"></rect>\n${svgContentSymbols}\n${svgContentIcons}\n</svg>`;

		fs.writeFileSync('.github/icons.svg', svgContent);
		createScreenshot('.github/icons.svg');
		cb();
	});
});

gulp.task('icons-stroke', function (cb) {

	const icon = "disabled",
		strokes = ['.5', '1', '1.5', '2', '2.75'],
		svgFileContent = fs.readFileSync(`_site/icons/${icon}.svg`).toString(),
		padding = 16,
		paddingOuter = 5,
		iconSize = 64,
		width = (strokes.length * (iconSize + padding) - padding) + paddingOuter * 2,
		height = iconSize + paddingOuter * 2;

	let svgContentSymbols = '',
		svgContentIcons = '',
		x = paddingOuter;
	
	strokes.forEach(function (stroke) {
		let svgFileContentStroked = svgFileContent
			.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<symbol id="icon-${stroke}"`)
			.replace(' width="24" height="24"', '')
			.replace(' stroke-width="2"', ` stroke-width="${stroke}"`)
			.replace('</svg>', '</symbol>')
			.replace(/\n\s+/g, '');

		svgContentSymbols += `\t${svgFileContentStroked}\n`;
		svgContentIcons += `\t<use xlink:href="#icon-${stroke}" x="${x}" y="${paddingOuter}" width="${iconSize}" height="${iconSize}" />\n`;

		x += padding + iconSize;
	});

	const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="color: #354052"><rect x="0" y="0" width="${width}" height="${height}" fill="#fff"></rect>\n${svgContentSymbols}\n${svgContentIcons}\n</svg>`;

	fs.writeFileSync('icons-stroke.svg', svgContent);
	createScreenshot('icons-stroke.svg');
	cb();
});

gulp.task('optimize', function (cb) {
	glob("src/_icons/*.svg", {}, function (er, files) {

		files.forEach(function (file, i) {
			let svgFile = fs.readFileSync(file),
				svgFileContent = svgFile.toString();

			svgFileContent = svgFileContent
				.replace(/><\/(polyline|line|rect|circle|path)>/g, '/>')
				.replace(/rx="([^"]+)"\s+ry="\1"/g, 'rx="$1"')
				.replace(/\s?\/>/g, ' />')
				.replace(/\n\s*<(line|circle|path|polyline|rect)/g, "\n  <$1")
				.replace(/polyline points="([0-9.]+)\s([0-9.]+)\s([0-9.]+)\s([0-9.]+)"/g, 'line x1="$1" y1="$2" x2="$3" y2="$4"')
				.replace(/a([0-9.]+)\s([0-9.]+)\s([0-9.]+)\s?([0-1])\s?([0-1])\s?(-?[0-9.]+)\s?(-?[0-9.]+)/g, 'a$1 $2 $3 $4 $5 $6 $7')
				.replace(/\n\n+/g, "\n");

			fs.writeFileSync(file, svgFileContent);
		});

		cb();
	});
});

gulp.task('build-zip', function(cb) {
	const version = p.version;

	return gulp.src('{icons/**/*,icons-png/**/*,tabler-sprite.svg,tabler-sprite-nostroke.svg}')
		.pipe(zip(`tabler-icons-${version}.zip`))
		.pipe(gulp.dest('packages'))
});

gulp.task('build-jekyll', function(cb){
	cp.exec('bundle exec jekyll build', function() {
		cb();
	});
});

gulp.task('build-copy', function(cb){
	cp.exec('mkdir -p icons/ && rm -fd ./icons/* && cp ./_site/icons/* ./icons', function() {
		cb();
	});
});

gulp.task('clean-png', function(cb){
	cp.exec('rm -fd ./icons-png/*', function() {
		cb();
	});
});

gulp.task('svg-to-png', gulp.series('build-jekyll', 'clean-png', async (cb) => {
	let files = glob.sync("_site/icons/*.svg");

	await asyncForEach(files, async function (file, i) {
		let name = path.basename(file, '.svg');

		console.log('name', name);

		await svgToPng(file, `icons-png/${name}.png`);
	});

	cb();
}));

gulp.task('build', gulp.series('optimize', 'build-jekyll', 'build-copy', 'icons-sprite', 'icons-preview', 'build-zip'));
