import utils = require('util');
import program = require('commander');

import {logger, setLogLevel} from './logger';
import jobManager = require('ms-jobmanager');
import {map, forEach} from 'taskfunctional';

import fastTree = require('fast-tree-task');
import raxml = require('raxml-task');
//import iqtree = require('iq-treetask/build/index.js');
import iqtree = require('iq-treetask');
import gotree = require('gotree-task');
import  glob = require("glob");
 
// options is optional


/*
    Read-in an input file path
*/



program
  .version('0.1.0')
  .option('-i, --input [dirPath]', 'alignments folder')
  .option('-v, --verbosity [logLevel]', 'Set log level', setLogLevel, 'info')
.parse(process.argv)

if (!program.input)
    throw ('Please provide and input folder of *.aln files');

let patt:string = program.input + "/*.aln";
let aliFiles:string[] = glob.sync(patt);

logger.info(`${patt}--> ${aliFiles}`);
function display(d) {
    logger.info(`Chain joined OUTPUT:\n${ utils.format(d) }`);
}


jobManager.start({ "TCPip": "localhost", "port": "2323" })
.on("ready", () => {
    let myManagement = {
        'jobManager' : jobManager,
        'jobProfile' : 'dummy'
    }

    let inputs = aliFiles.map((fName) => { return  {'inputF' : fName}; });
    logger.info(`${utils.format(inputs)}`);

    let myTasks = [fastTree.Task, raxml.Task, iqtree.Task]; // <--- raxml will be gold


forEach( inputs, (i) => map(myManagement, i, myTasks) )
    .join( (allRes) => {
    // THIS BLOCK SHOULD BE A REDUCE W/ a join/then interface to avoid callback indentation/inflation -- MAYBE ....

    // For each gene aln file we get a collection of best tree per software
   let varTree:any[] = allRes.map((geneRes) => {
       let refTree = geneRes[1]; // We consider raxml tree as gold
        // just changin keys to be passed as input
        return geneRes.map((oneTaskRes) => { return { 'treeOne' : oneTaskRes['out'], 'treeTwo' : refTree['out'] }; });
    })

    //logger.info(`${utils.format(varTree)}`);

    forEach(varTree, (geneCollectionTrees)=> map(myManagement, geneCollectionTrees, gotree.Task))
        .join((d)=>{
            logger.info(`${utils.format(d)}`);

        }); 
    })
});