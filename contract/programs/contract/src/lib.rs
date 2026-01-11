use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};

declare_id!("3tezpLbcXZEZmiRjMMWfb2zSgnR39DpsCK8MC2BkFeAH");

pub const MAX_ROUNDS: usize = 288;
pub const EXPECTED_VERIFIER_PUBKEY: Pubkey = Pubkey::from_str_const("3tezpLbcXZEZmiRjMMWfb2zSgnR39DpsCK8MC2BkFeA4"); //TODO: Think abt this
pub const PROGRAM_AUTHORITY: Pubkey = Pubkey::from_str_const("3tezpLbcXZEZmiRjMMWfb2zSgnR39DpsCK8MC2BkFeA5"); //TODO: Think abt this
// TODO: Initialize Vaults
#[program]
pub mod contract {
    
    use super::*;

    pub fn initialize_validator(ctx: Context<InitializeValidator>) -> Result<()> {
        ctx.accounts.validator_account.validator_pubkey = ctx.accounts.validator.key();
        ctx.accounts.validator_account.stake_amount = 0;
        ctx.accounts.validator_account.is_active = false;
        ctx.accounts.validator_account.bump = ctx.bumps.validator_account;
        Ok(())
    }

    pub fn validator_stake(ctx: Context<ValidatorStake>, amount: u64) -> Result<()>{
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer{
                from: ctx.accounts.validator.to_account_info(),
                to: ctx.accounts.stake_pool.to_account_info()
            }
        );
        transfer(cpi_context, amount)?;
        ctx.accounts.validator_account.stake_amount += amount;
        ctx.accounts.validator_account.is_active = true;
        Ok(())
    }

    pub fn initialize_target(
        ctx: Context<InitializeTarget>,
        target_id: [u8; 32],
    ) -> Result<()> {
        ctx.accounts.target_account.target_id = target_id;
        ctx.accounts.target_account.created_at = Clock::get()?.unix_timestamp;
        ctx.accounts.target_account.bump = ctx.bumps.target_account;
        ctx.accounts.round_window_account.next_index = 0;
        ctx.accounts.round_window_account.target_id = target_id;
        ctx.accounts.round_window_account.window_start = Clock::get()?.unix_timestamp;
        ctx.accounts.round_window_account.bump = ctx.bumps.round_window_account;
        Ok(())
    }

    pub fn submit_round(
        ctx: Context<SubmitRound>,
        uptime_percent: u16,
        median_latency_ms: u32,
        report_hash: [u8; 16],
        reward_per_validator: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.reward_vault;
        
        let total_needed = reward_per_validator
            .checked_mul(ctx.remaining_accounts.len() as u64)
            .ok_or(ErrorCode::Overflow)?;
        
        let vault_balance = vault.to_account_info().lamports();
        let rent_exempt_minimum = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
        let available_balance = vault_balance.saturating_sub(rent_exempt_minimum);
        
        require!(
            available_balance >= total_needed,
            ErrorCode::InsufficientFunds
        );
        require!(reward_per_validator > 0, ErrorCode::ZeroAmount);
        require!(!ctx.remaining_accounts.is_empty(), ErrorCode::NoRecipients);

        let window = &mut ctx.accounts.round_window_account;
        let idx = window.next_index as usize;
        let now = Clock::get()?.unix_timestamp;
        let prev_idx = if window.next_index == 0 { 
            (MAX_ROUNDS - 1) as usize 
        } else { 
            (window.next_index - 1) as usize 
        };
        
        if window.rounds[prev_idx].timestamp != 0 {
            require!(
                window.rounds[prev_idx].timestamp < now,
                ErrorCode::InvalidRoundOrder
            );
        }

        window.rounds[idx] = RoundSummary {
            timestamp: now,
            uptime_percent,
            median_latency_ms,
            report_hash,
        };

        for account_info in ctx.remaining_accounts.iter(){
            **ctx.accounts.reward_vault.to_account_info().try_borrow_mut_lamports()? -= reward_per_validator;
            **account_info.try_borrow_mut_lamports()? += reward_per_validator;
        }

        msg!("Distributed {} lamports to {} validators", 
        reward_per_validator, 
        ctx.remaining_accounts.len());

        window.next_index = (window.next_index + 1) % MAX_ROUNDS as u16;
        Ok(())
    }
    
    pub fn validator_unstake(ctx: Context<ValidatorUnstake>) -> Result<()>{
        let stake_amount = ctx.accounts.validator_account.stake_amount;
        require!(stake_amount > 0, ErrorCode::NoStakeAmountToUnstake);
        let rent_exempt_minimum = Rent::get()?.minimum_balance(
            ctx.accounts.stake_pool.to_account_info().data_len()
        );
        let pool_balance = ctx.accounts.stake_pool.to_account_info().lamports();
        
        require!(
            pool_balance.saturating_sub(stake_amount) >= rent_exempt_minimum,
            ErrorCode::InsufficientFunds
        );
        **ctx.accounts.stake_pool.to_account_info().try_borrow_mut_lamports()? -= stake_amount;
        **ctx.accounts.validator.to_account_info().try_borrow_mut_lamports()? += stake_amount;
        ctx.accounts.validator_account.stake_amount = 0;
        ctx.accounts.validator_account.is_active = false;
        Ok(())
    }
    
    
}

#[derive(Accounts)]
pub struct InitializeValidator<'info>{
    #[account(
        init,
        space = 8 + size_of::<ValidatorAccount>(),
        payer = authority,
        seeds = [b"validator", validator.key().as_ref()],
        bump
    )]
    pub validator_account: Account<'info, ValidatorAccount>,

    
    pub validator: SystemAccount<'info>,

    #[account(
        mut,
        constraint = authority.key() == PROGRAM_AUTHORITY @ ErrorCode::Unauthorized
    )]
    pub authority: Signer<'info>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
pub struct ValidatorStake<'info>{
    #[account(
        mut,
        seeds = [b"validator", validator.key().as_ref()],
        bump = validator_account.bump
    )]
    pub validator_account: Account<'info, ValidatorAccount>,

    pub validator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_pool"],
        bump = stake_pool.bump
    )]
    pub stake_pool: Account<'info, StakeVault>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(target_id: [u8; 32])]
pub struct InitializeTarget<'info>{
    #[account(
        init,
        payer = authority,
        space = 8 + size_of::<TargetAccount>(),
        seeds = [b"target", target_id.as_ref()],
        bump
    )]
    pub target_account: Account<'info, TargetAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + size_of::<RoundWindowAccount>(),
        seeds = [b"round_window", target_id.as_ref()],
        bump
    )]
    pub round_window_account: Account<'info, RoundWindowAccount>,

    #[account(
        mut,
        constraint = authority.key() == PROGRAM_AUTHORITY @ ErrorCode::Unauthorized
    )]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(target_id: [u8; 32])]

pub struct SubmitRound<'info>{
    #[account(
        seeds = [b"target", target_id.as_ref()],
        bump = target_account.bump
    )]
    pub target_account: Account<'info, TargetAccount>,

    #[account(
        mut,
        seeds = [b"round_window", target_account.target_id.as_ref()],
        bump = round_window_account.bump
    )]
    pub round_window_account: Account<'info, RoundWindowAccount>,

    #[account(
        mut,
        seeds = [b"reward_vault"],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVault>,

    #[account(
        constraint = verifier.key() == EXPECTED_VERIFIER_PUBKEY
    )]
    pub verifier: Signer<'info>,

}

#[derive(Accounts)]
pub struct ValidatorUnstake<'info>{
    #[account(
        mut,
        seeds = [b"validator", validator.key().as_ref()],
        bump = validator_account.bump
    )]
    pub validator_account: Account<'info, ValidatorAccount>,

    pub validator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake_pool"],
        bump = stake_pool.bump
    )]
    pub stake_pool: Account<'info, StakeVault>,
}

#[account]
pub struct ValidatorAccount{
    pub validator_pubkey: Pubkey,
    pub stake_amount: u64,
    pub is_active: bool,
    pub bump: u8
}

#[account]
pub struct TargetAccount{
    pub target_id: [u8;32],
    pub created_at: i64,
    pub bump: u8
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct RoundSummary{
    pub timestamp: i64,
    pub uptime_percent: u16,
    pub median_latency_ms: u32,
    pub report_hash: [u8; 16]
}


#[account]
pub struct RoundWindowAccount {
    pub target_id: [u8; 32],
    pub window_start: i64,
    pub next_index: u16,
    pub rounds: [RoundSummary; MAX_ROUNDS],
    pub bump: u8
}

#[account]
pub struct StakeVault{
    pub bump: u8
}

#[account]
pub struct RewardVault{
    pub bump: u8
}


#[error_code]
pub enum ErrorCode {
    #[msg("Vault has insufficient funds")]
    InsufficientFunds,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Reward amount must be greater than zero")]
    ZeroAmount,
    #[msg("No recipients provided")]
    NoRecipients,
    #[msg("InvalidRoundOrder")]
    InvalidRoundOrder,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Stake amount is 0")]
    NoStakeAmountToUnstake

}