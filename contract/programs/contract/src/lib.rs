use anchor_lang::prelude::*;

declare_id!("3tezpLbcXZEZmiRjMMWfb2zSgnR39DpsCK8MC2BkFeAH");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
