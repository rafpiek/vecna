#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../../package.json';

const program = new Command();

program
    .action(() => {
        console.log(version);
    });

program.parse(process.argv);
