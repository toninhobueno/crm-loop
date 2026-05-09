-- Script SQL para adicionar as colunas condition e conditionValue à tabela Floups
-- Execute este script diretamente no PostgreSQL se a migração não funcionar

-- Verificar se a tabela existe e obter o nome exato (case-sensitive)
DO $$
DECLARE
    table_name_var TEXT;
    condition_exists BOOLEAN;
    condition_value_exists BOOLEAN;
BEGIN
    -- Encontrar o nome exato da tabela
    SELECT table_name INTO table_name_var
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND LOWER(table_name) = LOWER('Floups')
    LIMIT 1;

    IF table_name_var IS NULL THEN
        RAISE NOTICE 'Tabela Floups não encontrada.';
        RETURN;
    END IF;

    RAISE NOTICE 'Usando tabela: %', table_name_var;

    -- Verificar se a coluna condition existe
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = table_name_var
        AND column_name = 'condition'
    ) INTO condition_exists;

    -- Verificar se a coluna conditionValue existe
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = table_name_var
        AND column_name = 'conditionValue'
    ) INTO condition_value_exists;

    -- Adicionar coluna condition se não existir
    IF NOT condition_exists THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN condition VARCHAR(255) DEFAULT ''queue''', table_name_var);
        RAISE NOTICE 'Coluna condition adicionada.';
    ELSE
        RAISE NOTICE 'Coluna condition já existe.';
    END IF;

    -- Adicionar coluna conditionValue se não existir
    IF NOT condition_value_exists THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN "conditionValue" TEXT DEFAULT ''''', table_name_var);
        RAISE NOTICE 'Coluna conditionValue adicionada.';
    ELSE
        RAISE NOTICE 'Coluna conditionValue já existe.';
    END IF;

END $$;

